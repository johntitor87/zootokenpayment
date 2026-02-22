/**
 * ZOO Token payment: build SPL transfer, sign with wallet, submit signature to WordPress.
 * Expects zooPay (orderId, orderKey, amountZoo, storeWallet, mintAddress, ajaxUrl, nonce, apiUrl) and wallet (from wallet.js / cookie).
 */

(function () {
  'use strict';

  if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
    window.Buffer = function (a) {
      if (a instanceof Uint8Array) return a;
      if (typeof a === 'number') return new Uint8Array(a);
      return new Uint8Array(0);
    };
    window.Buffer.from = function (a) {
      if (a instanceof ArrayBuffer) return new Uint8Array(a);
      if (Array.isArray(a)) return new Uint8Array(a);
      if (a instanceof Uint8Array) return a;
      if (typeof a === 'string') return new TextEncoder().encode(a);
      return new Uint8Array(0);
    };
    window.Buffer.isBuffer = function (b) { return b instanceof Uint8Array; };
  }

  var DECIMALS = 9;
  var TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  var ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
  var RPC = 'https://api.devnet.solana.com';

  function getProvider() {
    if (typeof window !== 'undefined' && window.solana && window.solana.isPhantom) {
      return window.solana;
    }
    if (typeof window !== 'undefined' && window.solflare) {
      return window.solflare;
    }
    if (typeof window !== 'undefined' && window.backpack) {
      return window.backpack;
    }
    return null;
  }

  function getWalletFromPage() {
    if (typeof zoo_get_user_wallet === 'function') {
      return zoo_get_user_wallet();
    }
    if (typeof document !== 'undefined' && document.cookie) {
      var m = document.cookie.match(/zoo_wallet_address=([^;]+)/);
            if (m && m[1]) return decodeURIComponent(m[1].trim());
    }
    return '';
  }

  function showError(msg) {
    var el = document.getElementById('zoo-pay-error');
    if (el) {
      el.textContent = msg || '';
      el.style.display = msg ? 'block' : 'none';
    }
  }

  function showSuccess() {
    var el = document.getElementById('zoo-pay-success');
    if (el) el.style.display = 'block';
  }

  function runPay() {
    if (typeof zooPay === 'undefined') {
      showError('Payment config missing.');
      return;
    }

    var orderId = zooPay.orderId;
    var orderKey = zooPay.orderKey;
    var amountZoo = parseFloat(zooPay.amountZoo);
    var storeWallet = zooPay.storeWallet;
    var mintAddress = zooPay.mintAddress;
    var ajaxUrl = zooPay.ajaxUrl;
    var nonce = zooPay.nonce;

    if (!orderId || !orderKey || !amountZoo || !storeWallet || !mintAddress || !ajaxUrl || !nonce) {
      showError('Missing payment config.');
      return;
    }

    var provider = getProvider();
    if (!provider) {
      showError('Please install a Solana wallet (e.g. Phantom) and connect.');
      return;
    }

    showError('');

    var amountLamports = Math.floor(amountZoo * Math.pow(10, DECIMALS));

    function showErr(err) {
      var msg = (err && err.message) ? err.message : String(err);
      if (/rejected|cancelled|denied/i.test(msg)) msg = 'You cancelled the transaction.';
      if (err && err.code === 4001) msg = 'You cancelled the request.';
      showError(msg);
      if (typeof console !== 'undefined' && console.error) console.error('ZOO pay error:', err);
    }

    function doSignAndSend() {
      provider.request({ method: 'connect' }).then(function () {
        var payer, payerStr, Solana, connection, mint, store, ataProgramId, tokenProgramId;
        var sourceAta, destAta, data, keys, ix, tx;

        try {
          payer = provider.publicKey;
          if (!payer) {
            showError('Could not get wallet address.');
            return;
          }
          payerStr = typeof payer.toString === 'function' ? payer.toString() : String(payer);

          Solana = typeof solanaWeb3 !== 'undefined' ? solanaWeb3 : (window.solanaWeb3 || window.SolanaWeb3);
          if (!Solana || !Solana.Connection || !Solana.PublicKey || !Solana.Transaction || !Solana.TransactionInstruction) {
            showError('Solana library not loaded. Please refresh the page.');
            return;
          }

          connection = new Solana.Connection(RPC, 'confirmed');
          mint = new Solana.PublicKey(mintAddress);
          store = new Solana.PublicKey(storeWallet);
          ataProgramId = new Solana.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID);
          tokenProgramId = new Solana.PublicKey(TOKEN_PROGRAM_ID);

          sourceAta = Solana.PublicKey.findProgramAddressSync(
            [payer.toBuffer(), tokenProgramId.toBuffer(), mint.toBuffer()],
            ataProgramId
          )[0];
          destAta = Solana.PublicKey.findProgramAddressSync(
            [store.toBuffer(), tokenProgramId.toBuffer(), mint.toBuffer()],
            ataProgramId
          )[0];

          data = new Uint8Array(9);
          data[0] = 3;
          new DataView(data.buffer).setBigUint64(1, BigInt(amountLamports), true);
          keys = [
            { pubkey: sourceAta, isSigner: false, isWritable: true },
            { pubkey: destAta, isSigner: false, isWritable: true },
            { pubkey: payer, isSigner: true, isWritable: false },
          ];
          ix = new Solana.TransactionInstruction({ keys: keys, programId: tokenProgramId, data: data });
          tx = new Solana.Transaction().add(ix);
        } catch (e) {
          showErr(e);
          return;
        }

        connection.getLatestBlockhash().then(function (res) {
          tx.recentBlockhash = res.blockhash;
          tx.feePayer = payer;
          if (typeof provider.signAndSendTransaction !== 'function') {
            throw new Error('Wallet does not support signAndSendTransaction');
          }
          return provider.signAndSendTransaction(tx);
        }).then(function (sig) {
          var signature = (typeof sig === 'string') ? sig : (sig && (sig.signature || sig.transactionSignature));
          if (!signature) {
            showError('No signature returned.');
            return;
          }
          var form = new FormData();
          form.append('action', 'zoo_verify_payment');
          form.append('nonce', nonce);
          form.append('order_id', orderId);
          form.append('order_key', orderKey);
          form.append('signature', signature);
          form.append('wallet', payerStr);
          var xhr = new XMLHttpRequest();
          xhr.open('POST', ajaxUrl);
          xhr.onload = function () {
            var res;
            try {
              res = JSON.parse(xhr.responseText || '{}');
            } catch (e) {
              showError('Invalid response from server. Check that the Staking API URL is correct in Settings → ZOO Staking.');
              return;
            }
            if (res.success) {
              showSuccess();
              setTimeout(function () { window.location.reload(); }, 1500);
            } else {
              var msg = (res.data && res.data.message) ? res.data.message : (res.message || 'Verification failed.');
              showError(msg);
            }
          };
          xhr.onerror = function () {
            showError('Network error: could not reach the store. Your payment may have been sent; please contact support with your order number. (If you use a Staking API URL, ensure it is reachable from the store server.)');
          };
          xhr.send(form);
        }).catch(function (err) {
          showErr(err);
        });
      }).catch(function (err) {
        showErr(err);
      });
    }

    doSignAndSend();
  }

  var btn = document.getElementById('zoo-pay-btn');
  if (btn) {
    btn.addEventListener('click', runPay);
  }
})();
