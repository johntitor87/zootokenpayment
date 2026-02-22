/**
 * ZOO Solana WooCommerce – frontend wallet connection (Phantom / window.solana)
 * Connects wallet and sends public key to backend via AJAX; backend stores in cookie/user meta.
 */
(function () {
  'use strict';

  var apiUrl = typeof zooStakingApi !== 'undefined' ? zooStakingApi.apiUrl : '';
  var ajaxUrl = typeof zooStakingApi !== 'undefined' ? zooStakingApi.ajaxUrl : '';
  var nonce = typeof zooStakingApi !== 'undefined' ? zooStakingApi.nonce : '';

  function getProvider() {
    if (typeof window !== 'undefined' && window.solana && window.solana.isPhantom) {
      return window.solana;
    }
    if (typeof window !== 'undefined' && window.phantom && window.phantom.solana) {
      return window.phantom.solana;
    }
    return null;
  }

  function showError(el, msg) {
    var err = document.querySelector('#zoo-wallet-connect .zoo-wallet-error');
    if (err) {
      err.textContent = msg || '';
      err.style.display = msg ? 'block' : 'none';
    }
  }

  function saveWalletToBackend(address, done) {
    var form = new FormData();
    form.append('action', 'zoo_save_wallet');
    form.append('nonce', nonce);
    form.append('wallet_address', address);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', ajaxUrl);
    xhr.onload = function () {
      var res;
      try {
        res = JSON.parse(xhr.responseText);
      } catch (e) {
        done(new Error('Invalid response'));
        return;
      }
      if (res.success) {
        done(null);
      } else {
        done(new Error(res.data && res.data.message ? res.data.message : 'Failed to save'));
      }
    };
    xhr.onerror = function () {
      done(new Error('Network error'));
    };
    xhr.send(form);
  }

  function connectWallet() {
    var provider = getProvider();
    if (!provider) {
      showError(null, 'Please install Phantom (or another Solana wallet) and try again.');
      return;
    }

    showError(null, '');

    provider.connect({ onlyIfTrusted: false })
      .then(function (result) {
        var pubkey = result && result.publicKey ? result.publicKey.toString() : (provider.publicKey ? provider.publicKey.toString() : null);
        if (!pubkey) {
          showError(null, 'Could not get wallet address.');
          return;
        }
        saveWalletToBackend(pubkey, function (err) {
          if (err) {
            showError(null, err.message);
            return;
          }
          window.location.reload();
        });
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : 'Connection failed.';
        if (/user rejected/i.test(msg)) {
          msg = 'Connection cancelled.';
        }
        showError(null, msg);
      });
  }

  function disconnectWallet() {
    var form = new FormData();
    form.append('action', 'zoo_save_wallet');
    form.append('nonce', nonce);
    form.append('wallet_address', '');

    var xhr = new XMLHttpRequest();
    xhr.open('POST', ajaxUrl);
    xhr.onload = function () {
      try {
        var res = JSON.parse(xhr.responseText);
        if (res.success) {
          document.cookie = 'zoo_wallet_address=; path=/; max-age=0';
          window.location.reload();
        }
      } catch (e) {}
      window.location.reload();
    };
    xhr.send(form);
  }

  function bindUi() {
    var box = document.getElementById('zoo-wallet-connect');
    if (!box) return;

    var connectBtn = box.querySelector('.zoo-wallet-connect');
    var disconnectBtn = box.querySelector('.zoo-wallet-disconnect');

    if (connectBtn) {
      connectBtn.addEventListener('click', connectWallet);
    }
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', function () {
        var provider = getProvider();
        if (provider && provider.disconnect) {
          provider.disconnect().catch(function () {});
        }
        disconnectWallet();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindUi);
  } else {
    bindUi();
  }
})();
