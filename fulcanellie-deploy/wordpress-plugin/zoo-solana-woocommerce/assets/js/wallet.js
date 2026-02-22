/**
 * ZOO Solana WooCommerce – Solana wallet connection (Phantom, Solflare, Backpack, etc.)
 * Connects with chosen Solana wallet and sends public key to backend via AJAX.
 */
(function () {
  'use strict';

  var ajaxUrl = typeof zooStakingApi !== 'undefined' ? zooStakingApi.ajaxUrl : '';
  var nonce = typeof zooStakingApi !== 'undefined' ? zooStakingApi.nonce : '';

  var isConnecting = false;

  // Solana-only wallets (order = preference when multiple installed)
  var WALLETS = [
    { id: 'phantom', name: 'Phantom', getProvider: function () { return (typeof window !== 'undefined' && window.solana && window.solana.isPhantom) ? window.solana : (window.phantom && window.phantom.solana) || null; } },
    { id: 'solflare', name: 'Solflare', getProvider: function () { return (typeof window !== 'undefined' && window.solflare) ? window.solflare : null; } },
    { id: 'backpack', name: 'Backpack', getProvider: function () { return (typeof window !== 'undefined' && window.backpack) ? window.backpack : null; } },
    { id: 'okx', name: 'OKX Wallet', getProvider: function () { return (typeof window !== 'undefined' && window.okxwallet && window.okxwallet.solana) ? window.okxwallet.solana : null; } },
    { id: 'coinbase', name: 'Coinbase Wallet', getProvider: function () { return (typeof window !== 'undefined' && window.coinbaseWalletExtension && window.coinbaseWalletExtension.solana) ? window.coinbaseWalletExtension.solana : null; } }
  ];

  function getAvailableWallets() {
    var out = [];
    for (var i = 0; i < WALLETS.length; i++) {
      var p = WALLETS[i].getProvider();
      if (p && typeof p.connect === 'function') {
        out.push({ id: WALLETS[i].id, name: WALLETS[i].name, provider: p });
      }
    }
    return out;
  }

  function showError(msg, box) {
    var err = box ? box.querySelector('.zoo-wallet-error') : document.querySelector('.zoo-wallet-box .zoo-wallet-error');
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
      try {
        var res = JSON.parse(xhr.responseText);
        if (res.success) {
          done(null);
        } else {
          done(new Error(res.data && res.data.message ? res.data.message : 'Failed to save'));
        }
      } catch (e) {
        done(new Error('Invalid response'));
      }
    };
    xhr.onerror = function () {
      done(new Error('Network error'));
    };
    xhr.send(form);
  }

  function connectWithProvider(provider, walletName, box) {
    if (isConnecting) return;
    showError('', box);
    isConnecting = true;

    var timeoutId = setTimeout(function () {
      isConnecting = false;
    }, 60000);

    function done() {
      clearTimeout(timeoutId);
      isConnecting = false;
    }

    function doConnect() {
      try {
        if (provider.isConnected && provider.publicKey) {
          handleConnected(provider.publicKey.toString(), box);
          done();
          return;
        }
        var connectPromise = null;
        if (typeof provider.connect === 'function') {
          try {
            connectPromise = provider.connect({ onlyIfTrusted: false });
          } catch (e) {
            connectPromise = provider.connect();
          }
        }
        if ((!connectPromise || typeof connectPromise.then !== 'function') && typeof provider.request === 'function') {
          connectPromise = provider.request({ method: 'connect' });
        }
        if (!connectPromise || typeof connectPromise.then !== 'function') {
          showError('Connection failed. Try another wallet or update ' + walletName + '.', box);
          done();
          return;
        }
        connectPromise.then(function (result) {
          clearTimeout(timeoutId);
          var pk = (result && result.publicKey) ? result.publicKey : (provider.publicKey || null);
          if (pk && typeof pk.toString === 'function') {
            handleConnected(pk.toString(), box);
          } else {
            showError('Could not get wallet address.', box);
            done();
          }
        }).catch(function (err) {
          clearTimeout(timeoutId);
          var code = err && err.code;
          var msg = (err && err.message) ? err.message : 'Connection failed.';
          if (code === 4001) {
            showError('Connection cancelled. Click Connect again and approve in ' + walletName + '.', box);
          } else if (code === -32603) {
            showError('Wallets need HTTPS. Use this site via https:// (not http://).', box);
          } else if (/rejected|cancelled|denied|user said no/i.test(msg)) {
            showError('Connection cancelled. Try again and tap Approve in ' + walletName + '.', box);
          } else {
            showError(msg + (code ? ' (code ' + code + ')' : ''), box);
          }
          done();
        });
      } catch (e) {
        showError((e && e.message) ? e.message : 'Connection failed.', box);
        done();
      }
    }

    doConnect();
  }

  function connectWallet(box, chosenProvider, walletName) {
    var loc = typeof window !== 'undefined' && window.location;
    if (loc && loc.protocol === 'http:' && loc.hostname !== 'localhost' && loc.hostname !== '127.0.0.1') {
      showError('Wallets require HTTPS. Please open this site using https:// and try again.', box);
      return;
    }

    var available = getAvailableWallets();
    if (chosenProvider && chosenProvider.connect) {
      connectWithProvider(chosenProvider, walletName || 'Wallet', box);
      return;
    }
    if (available.length === 0) {
      showError('No Solana wallet detected. Install Phantom, Solflare, or Backpack.', box);
      return;
    }
    if (available.length === 1) {
      connectWithProvider(available[0].provider, available[0].name, box);
      return;
    }
    openChooser(box);
  }

  function openChooser(box) {
    var list = box.querySelector('.zoo-wallet-list');
    if (list) {
      list.style.display = list.style.display === 'none' ? 'block' : 'none';
      return;
    }
    var available = getAvailableWallets();
    var wrap = box.querySelector('.zoo-wallet-chooser') || box;
    list = document.createElement('div');
    list.className = 'zoo-wallet-list';
    list.style.display = 'block';
    available.forEach(function (w) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zoo-wallet-option';
      btn.textContent = w.name;
      btn.addEventListener('click', function () {
        list.style.display = 'none';
        connectWithProvider(w.provider, w.name, box);
      });
      list.appendChild(btn);
    });
    wrap.appendChild(list);
  }

  function handleConnected(pubkey, box) {
    if (!pubkey) {
      showError('Could not get wallet address.', box);
      isConnecting = false;
      return;
    }
    saveWalletToBackend(pubkey, function (err) {
      isConnecting = false;
      if (err) {
        showError(err.message, box);
        return;
      }
      window.location.reload();
    });
  }

  function disconnectWallet() {
    if (typeof window !== 'undefined' && window.solana && typeof window.solana.disconnect === 'function') {
      window.solana.disconnect().catch(function () {});
    }
    var available = getAvailableWallets();
    available.forEach(function (w) {
      if (w.provider && typeof w.provider.disconnect === 'function') {
        w.provider.disconnect().catch(function () {});
      }
    });
    var form = new FormData();
    form.append('action', 'zoo_save_wallet');
    form.append('nonce', nonce);
    form.append('wallet_address', '');

    var xhr = new XMLHttpRequest();
    xhr.open('POST', ajaxUrl);
    xhr.onload = function () {
      document.cookie = 'zoo_wallet_address=; path=/; max-age=0';
      window.location.reload();
    };
    xhr.onerror = function () {
      document.cookie = 'zoo_wallet_address=; path=/; max-age=0';
      window.location.reload();
    };
    xhr.send(form);
  }

  function bindUi() {
    var boxes = document.querySelectorAll('.zoo-wallet-box');
    boxes.forEach(function (box) {
      var connectBtn = box.querySelector('.zoo-wallet-connect');
      var disconnectBtn = box.querySelector('.zoo-wallet-disconnect');

      if (connectBtn && !connectBtn.dataset.bound) {
        connectBtn.dataset.bound = "1";
        connectBtn.addEventListener('click', function () {
          connectWallet(box);
        });
      }
      if (disconnectBtn) {
        disconnectBtn.dataset.bound = "1";
      }
    });
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!target || !target.closest) return;
    var btn = target.closest('.zoo-wallet-disconnect');
    if (btn && btn.closest('.zoo-wallet-box')) {
      e.preventDefault();
      e.stopPropagation();
      disconnectWallet();
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindUi);
  } else {
    bindUi();
  }

  if (typeof jQuery !== 'undefined') {
    jQuery(document.body).on('updated_checkout', function () {
      bindUi();
    });
  }
})();
