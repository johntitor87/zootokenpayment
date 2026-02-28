/**
 * ZOO Solana Checkout – Connect Phantom Wallet, verify balance, and send ZOO transfer on Place Order.
 * ZOO_MINT_ADDRESS = FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3, 9 decimals.
 * Requires: jQuery, window.zooCheckout (apiUrl, zooMint, shopWallet, rpcUrl)
 */
(function () {
  var ZOO_MINT_ADDRESS = 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3';
  var DECIMALS = 9;
  var TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  var ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

  function getSolana() {
    return typeof solanaWeb3 !== 'undefined' ? solanaWeb3 : (window.solanaWeb3 || window.SolanaWeb3);
  }

  /**
   * Send ZOO tokens from customer wallet to shop wallet.
   * @param {string|object} walletPublicKey - Customer wallet address (string or PublicKey)
   * @param {number} amount - Amount in ZOO (human-readable, e.g. 10)
   * @returns {Promise<string>} Transaction signature
   */
  window.payWithZoo = async function payWithZoo(walletPublicKey, amount) {
    var provider = window.solana;
    if (!provider || !provider.isPhantom) throw new Error('Phantom wallet not found');

    var Solana = getSolana();
    if (!Solana || !Solana.Connection || !Solana.PublicKey || !Solana.Transaction || !Solana.TransactionInstruction) {
      throw new Error('Solana web3.js not loaded');
    }

    var zooMint = (typeof zooCheckout !== 'undefined' && zooCheckout.zooMint) ? zooCheckout.zooMint : ZOO_MINT_ADDRESS;
    var shopWallet = typeof zooCheckout !== 'undefined' && zooCheckout.shopWallet ? zooCheckout.shopWallet : null;
    var rpcUrl = (typeof zooCheckout !== 'undefined' && zooCheckout.rpcUrl) ? zooCheckout.rpcUrl : 'https://api.mainnet-beta.solana.com';

    if (!shopWallet) throw new Error('Shop wallet not configured. Set ZOO_SOLANA_CHECKOUT_SHOP_WALLET in wp-config.php.');

    var connection = new Solana.Connection(rpcUrl);
    var walletPk = walletPublicKey instanceof Solana.PublicKey ? walletPublicKey : new Solana.PublicKey(walletPublicKey);
    var ZOO_MINT = new Solana.PublicKey(zooMint);
    var SHOP_WALLET = new Solana.PublicKey(shopWallet);

    var tokenProgramId = new Solana.PublicKey(TOKEN_PROGRAM_ID);
    var ataProgramId = new Solana.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID);

    var customerTokenAddress = Solana.PublicKey.findProgramAddressSync(
      [walletPk.toBuffer(), tokenProgramId.toBuffer(), ZOO_MINT.toBuffer()],
      ataProgramId
    )[0];
    var shopTokenAddress = Solana.PublicKey.findProgramAddressSync(
      [SHOP_WALLET.toBuffer(), tokenProgramId.toBuffer(), ZOO_MINT.toBuffer()],
      ataProgramId
    )[0];

    var rawAmount = Math.floor(amount * Math.pow(10, DECIMALS));
    var data = new Uint8Array(9);
    data[0] = 3; // SPL Token Transfer instruction
    new DataView(data.buffer).setBigUint64(1, BigInt(rawAmount), true);

    var transferIx = new Solana.TransactionInstruction({
      keys: [
        { pubkey: customerTokenAddress, isSigner: false, isWritable: true },
        { pubkey: shopTokenAddress, isSigner: false, isWritable: true },
        { pubkey: walletPk, isSigner: true, isWritable: false },
      ],
      programId: tokenProgramId,
      data: data,
    });

    var tx = new Solana.Transaction().add(transferIx);
    tx.feePayer = walletPk;
    var blockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash.blockhash;

    var signedTx = await provider.signTransaction(tx);
    var signature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

    return signature;
  };

  jQuery(document).ready(function ($) {
    var connectButton = $('<button type="button" class="button">Connect Phantom Wallet</button>');
    var balanceDiv = $('<div id="zoo-balance"></div>');
    var walletInput = $('<input type="hidden" name="wallet_address" id="wallet_address">');
    var checkoutButton = $('#place_order');

    if ($('#checkout').length) {
      $('#checkout').prepend(walletInput, connectButton, balanceDiv);
    }

    var walletPublicKey = null;

    connectButton.on('click', async function () {
      if (window.solana && window.solana.isPhantom) {
        try {
          var resp = await window.solana.connect();
          walletPublicKey = resp.publicKey.toString();
          balanceDiv.text('Wallet connected: ' + walletPublicKey.slice(0, 8) + '…' + walletPublicKey.slice(-8));
          walletInput.val(walletPublicKey);
        } catch (err) {
          alert('Wallet connection failed: ' + (err.message || err));
        }
      } else {
        alert('Phantom wallet not found. Please install Phantom.');
      }
    });

    // Hook into WooCommerce checkout: pay with ZOO, then verify with Render API
    checkoutButton.on('click', async function (e) {
      var provider = window.solana;
      if (!provider || !provider.isPhantom) {
        alert('Please connect your Phantom wallet first.');
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      var walletPublicKey = provider.publicKey;
      if (!walletPublicKey) {
        alert('Please connect your Phantom wallet first.');
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      var amountEl = $('#order_review .order-total .amount');
      var amount = amountEl.length
        ? parseFloat(amountEl.text().replace(/[^0-9.-]+/g, ''))
        : parseFloat($('.order-total .woocommerce-Price-amount').last().text().replace(/[^0-9.-]+/g, '')) || 0;
      if (!amount || isNaN(amount)) amount = 10;

      e.preventDefault();
      e.stopImmediatePropagation();

      try {
        var signature = await window.payWithZoo(walletPublicKey, amount);

        var payUrl = (typeof zooCheckout !== 'undefined' && zooCheckout.payUrl) ? zooCheckout.payUrl : (zooCheckout.apiUrl ? zooCheckout.apiUrl.replace(/\/verify\/?$/, '') + '/pay' : 'https://zoo-solana-checkout-api-1.onrender.com/pay');
        var resp = await fetch(payUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet: typeof walletPublicKey.toString === 'function' ? walletPublicKey.toString() : String(walletPublicKey),
            amount: amount,
            txSignature: signature
          })
        });

        var result = await resp.json();
        if (!result.success) {
          alert('Payment verification failed: ' + (result.error || 'Unknown'));
          return false;
        }

        var walletStr = typeof walletPublicKey.toString === 'function' ? walletPublicKey.toString() : String(walletPublicKey);
        walletInput.val(walletStr);
        checkoutButton.closest('form').submit();
      } catch (err) {
        var msg = (err && err.message) ? err.message : String(err);
        if (/rejected|cancelled|denied/i.test(msg)) msg = 'You cancelled the transaction.';
        alert('Payment failed: ' + msg);
        return false;
      }

      return false;
    });
  });
})();
