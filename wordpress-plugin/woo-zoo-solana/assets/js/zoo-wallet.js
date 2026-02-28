/**
 * Woo ZOO Solana Gateway – zoo-wallet.js
 *
 * Payment options: Square | ZOO Token only.
 * ZOO flow: Connect Phantom → send exact amount → send tx signature + order info to Render API
 * → API verifies mint, amount, recipient wallet, signature → only then complete checkout.
 * No premature redirect. Failures (Phantom cancel, insufficient balance, invalid tx) block
 * checkout and show an error.
 *
 * Frontend dynamic data: zoo_ajax.order_id, zoo_ajax.order_amount (wp_localize_script).
 */
(function () {
  var TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  var ZOO_MINT_ADDRESS = 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3';
  var ZOO_DECIMALS = 9;

  function getSolana() {
    return typeof solanaWeb3 !== 'undefined' ? solanaWeb3 : (window.solanaWeb3 || window.SolanaWeb3);
  }

  async function sendZooTokens(fromPublicKey, amount) {
    var Solana = getSolana();
    if (!Solana || !Solana.Connection || !Solana.PublicKey || !Solana.Transaction) {
      throw new Error('Solana web3.js not loaded');
    }

    var connection = new Solana.Connection(
      (typeof zoo_ajax !== 'undefined' && zoo_ajax.rpc_url) ? zoo_ajax.rpc_url : Solana.clusterApiUrl('mainnet-beta'),
      'confirmed'
    );

    var zooMint = (typeof zoo_ajax !== 'undefined' && zoo_ajax.zoo_mint) ? zoo_ajax.zoo_mint : ZOO_MINT_ADDRESS;
    var toWalletStr = typeof zoo_ajax !== 'undefined' && zoo_ajax.shop_wallet ? zoo_ajax.shop_wallet : null;
    if (!toWalletStr) throw new Error('Shop wallet not configured. Set "Shop Wallet" in ZOO Token gateway settings.');

    var fromPubKey = new Solana.PublicKey(fromPublicKey);
    var toWallet = new Solana.PublicKey(toWalletStr);
    var zooMintAddress = new Solana.PublicKey(zooMint);

    var fromTokenAccounts = await connection.getTokenAccountsByOwner(fromPubKey, { mint: zooMintAddress });
    if (!fromTokenAccounts.value || fromTokenAccounts.value.length === 0) {
      throw new Error('No ZOO token account found in wallet.');
    }
    var fromTokenAccount = fromTokenAccounts.value[0].pubkey;

    var toTokenAccounts = await connection.getTokenAccountsByOwner(toWallet, { mint: zooMintAddress });
    if (!toTokenAccounts.value || toTokenAccounts.value.length === 0) {
      throw new Error('Recipient token account does not exist. Please set up your wallet.');
    }
    var toTokenAccount = toTokenAccounts.value[0].pubkey;

    var rawAmount = Math.floor(amount * Math.pow(10, ZOO_DECIMALS));
    var tokenProgramId = new Solana.PublicKey(TOKEN_PROGRAM_ID);
    var data = new Uint8Array(9);
    data[0] = 3;
    new DataView(data.buffer).setBigUint64(1, BigInt(rawAmount), true);

    var transferIx = new Solana.TransactionInstruction({
      keys: [
        { pubkey: fromTokenAccount, isSigner: false, isWritable: true },
        { pubkey: toTokenAccount, isSigner: false, isWritable: true },
        { pubkey: fromPubKey, isSigner: true, isWritable: false },
      ],
      programId: tokenProgramId,
      data: data,
    });

    var transaction = new Solana.Transaction().add(transferIx);

    var provider = window.solana;
    if (!provider || !provider.isPhantom) throw new Error('Phantom wallet not found');

    var signature;
    if (typeof provider.signAndSendTransaction === 'function') {
      var result = await provider.signAndSendTransaction(transaction);
      signature = (typeof result === 'string') ? result : (result.signature || result.transactionSignature);
    } else {
      var signedTx = await provider.signTransaction(transaction);
      signature = await connection.sendRawTransaction(signedTx.serialize());
    }
    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
  }

  window.sendZooTokens = sendZooTokens;

  jQuery(document).ready(function ($) {
    // Dynamic order data from PHP (wp_localize_script) – used for exact amount and verification
    const wc_order_id = typeof zoo_ajax !== 'undefined' ? zoo_ajax.order_id : null;
    const wc_order_amount = typeof zoo_ajax !== 'undefined' && (zoo_ajax.order_amount != null || zoo_ajax.order_total != null)
      ? parseFloat(zoo_ajax.order_amount != null ? zoo_ajax.order_amount : zoo_ajax.order_total)
      : null;

    var btn = document.getElementById('zoo-token-pay-btn');
    if (!btn) return;

    function getOrderAmount() {
      if (wc_order_amount != null && wc_order_amount > 0) return wc_order_amount;
      var totalEl = $('#order_review .order-total .amount');
      if (!totalEl.length) totalEl = $('.order-total .woocommerce-Price-amount').last();
      if (totalEl.length) {
        return parseFloat(totalEl.text().replace(/[^0-9.-]+/g, '')) || 0;
      }
      return 0;
    }

    btn.addEventListener('click', async function (e) {
      e.preventDefault();

      if (!window.solana || !window.solana.isPhantom) {
        $('#zoo-wallet-msg').text('Please install Phantom Wallet.');
        return;
      }

      var amount = getOrderAmount();
      if (!amount || amount <= 0) {
        $('#zoo-wallet-msg').text('Could not get order total. Please refresh and try again.');
        return;
      }

      if (typeof zoo_ajax === 'undefined' || !zoo_ajax.shop_wallet) {
        $('#zoo-wallet-msg').text('ZOO gateway is not configured (shop wallet missing).');
        return;
      }

      try {
        var resp = await window.solana.connect();
        var publicKey = resp.publicKey.toString();

        var txSignature = await sendZooTokens(publicKey, amount);

        var apiUrl = (typeof zoo_ajax !== 'undefined' && zoo_ajax.api_endpoint) ? zoo_ajax.api_endpoint : '';
        var result = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: wc_order_id,
            publicKey: publicKey,
            txSignature: txSignature,
            wallet: publicKey,
            amount: amount,
          }),
        }).then(function (r) { return r.json(); });

        if (result.verified || result.success) {
          if (zoo_ajax.order_id && zoo_ajax.order_id > 0 && zoo_ajax.order_key) {
            var confirmResp = await fetch(zoo_ajax.ajax_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                action: 'wcs_confirm_zoo_payment',
                order_id: zoo_ajax.order_id,
                order_key: zoo_ajax.order_key,
                tx_signature: txSignature,
                wallet: publicKey,
              }),
            }).then(function (r) { return r.json(); });
            if (confirmResp.success && confirmResp.data && confirmResp.data.redirect) {
              window.location.href = confirmResp.data.redirect;
              return;
            }
          }
          $('#zoo_tx_signature').val(txSignature);
          $('#zoo_wallet').val(publicKey);
          $('#zoo-wallet-msg').text('Payment verified. Completing order…');
          $('#place_order').click();
        } else {
          $('#zoo-wallet-msg').text('ZOO payment verification failed. Checkout blocked.');
        }
      } catch (err) {
        console.error(err);
        var msg = (err && err.message) ? err.message : 'Payment cancelled or failed.';
        if (/rejected|cancelled|denied/i.test(msg)) {
          msg = 'Transaction cancelled. Checkout blocked.';
        } else if (/insufficient|no.*token account|recipient.*does not exist/i.test(msg)) {
          msg = 'Insufficient ZOO balance or no token account. Checkout blocked.';
        } else if (/not found|failed on-chain|verification failed/i.test(msg)) {
          msg = 'Invalid transaction or verification failed. Checkout blocked.';
        }
        $('#zoo-wallet-msg').text(msg);
      }
    });
  });
})();
