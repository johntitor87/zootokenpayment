/**
 * ZOO Token payment via Phantom message signing (checkout API flow).
 * Expects window.zooCheckoutApi: { orderId, amount, apiUrl, orderReceivedUrl }
 */
(function () {
  'use strict';

  function base64ToUint8Array(base64) {
    var bin = atob(base64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function uint8ArrayToBase64(u8) {
    if (u8 instanceof Uint8Array) {
      var binary = '';
      for (var i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
      return btoa(binary);
    }
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(u8)) return u8.toString('base64');
    return '';
  }

  window.payWithZooToken = async function payWithZooToken(orderId, amount) {
    var config = typeof window.zooCheckoutApi !== 'undefined' ? window.zooCheckoutApi : {};
    var apiUrl = (config.apiUrl || '').replace(/\/+$/, '');
    var orderReceivedUrl = config.orderReceivedUrl || '/checkout/order-received/';

    if (!apiUrl) {
      alert('ZOO Checkout API URL is not configured.');
      return;
    }

    if (!window.solana || !window.solana.isPhantom) {
      alert('Please install Phantom wallet to pay with ZOO token.');
      return;
    }

    try {
      var provider = window.solana;
      await provider.connect();

      var publicKey = provider.publicKey.toString();

      var message = JSON.stringify({
        orderId: orderId,
        amount: amount,
        timestamp: Date.now()
      });
      var encodedMessage = new TextEncoder().encode(message);

      var signedMessage = await provider.signMessage(encodedMessage, 'utf8');

      var signaturePayload = signedMessage.signature;
      var signatureArray = Array.isArray(signaturePayload)
        ? signaturePayload
        : signaturePayload instanceof Uint8Array
          ? Array.from(signaturePayload)
          : [];

      var response = await fetch(apiUrl + '/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: publicKey,
          message: message,
          signature: signatureArray,
          amount: amount
        })
      });

      var data = await response.json();

      if (data.success) {
        if (data.transaction) {
          var txBytes = base64ToUint8Array(data.transaction);
          var Solana = typeof solanaWeb3 !== 'undefined' ? solanaWeb3 : (window.solanaWeb3 || window.SolanaWeb3);
          if (Solana && Solana.Transaction) {
            var tx = Solana.Transaction.from(txBytes);
            var signedTx = await provider.signTransaction(tx);
            var serialized = signedTx.serialize();
            var signedBase64 = uint8ArrayToBase64(serialized);
            var submitRes = await fetch(apiUrl + '/submit-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ signedTransaction: signedBase64 })
            });
            var submitData = await submitRes.json();
            if (!submitData.success) {
              alert('Payment failed: ' + (submitData.error || 'Transfer failed'));
              return;
            }
            if (submitData.txSignature) console.log('Transfer executed:', submitData.txSignature);
          }
        }
        alert('Payment verified and processed!');
        window.location.href = orderReceivedUrl;
      } else {
        alert('Payment failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error during payment. See console for details.');
    }
  };

  (function bindButton() {
    function onReady() {
      var btn = document.getElementById('zoo-pay-phantom-btn');
      var config = typeof window.zooCheckoutApi !== 'undefined' ? window.zooCheckoutApi : {};
      if (btn && config.orderId != null && config.amount != null) {
        btn.addEventListener('click', function () {
          window.payWithZooToken(config.orderId, config.amount);
        });
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady);
    } else {
      onReady();
    }
  })();
})();
