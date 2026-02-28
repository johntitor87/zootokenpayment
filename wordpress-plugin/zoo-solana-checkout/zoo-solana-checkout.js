/**
 * ZOO Solana Checkout – Connect Phantom Wallet on checkout and save wallet address.
 */
(function () {
  'use strict';

  function onReady() {
    var btn = document.getElementById('connect-wallet');
    var input = document.getElementById('wallet_address');
    var status = document.getElementById('wallet-status');
    if (!btn || !input) return;

    btn.addEventListener('click', function () {
      if (typeof window.solana === 'undefined' || !window.solana.isPhantom) {
        if (status) status.textContent = 'Please install Phantom wallet.';
        return;
      }

      window.solana.connect()
        .then(function (res) {
          var pubkey = (res && res.publicKey) ? res.publicKey : (window.solana.publicKey || null);
          var addr = pubkey && typeof pubkey.toString === 'function' ? pubkey.toString() : '';
          if (addr) {
            input.value = addr;
            if (status) status.textContent = 'Connected: ' + addr.slice(0, 4) + '…' + addr.slice(-4);
          } else {
            if (status) status.textContent = 'Could not get wallet address.';
          }
        })
        .catch(function (err) {
          if (status) status.textContent = err && err.message ? err.message : 'Connection failed.';
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
