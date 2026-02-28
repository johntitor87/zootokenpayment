<?php
/*
Plugin Name: ZOO Solana Checkout
Description: Allows customers to pay with ZOO token on Solana network via Phantom Wallet.
Version: 1.0
Author: Your Name
*/

if (!defined('ABSPATH')) exit; // Exit if accessed directly

class Zoo_Solana_Checkout {

    const API_URL = 'https://zoo-solana-checkout-api-1.onrender.com';
    const ZOO_MINT = 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3'; // ZOO_MINT_ADDRESS, 9 decimals
    const SHOP_WALLET = ''; // YOUR_ZOO_WALLET_PUBLIC_KEY – set via define('ZOO_SOLANA_CHECKOUT_SHOP_WALLET', '...') in wp-config.php

    public function __construct() {
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
        add_action('woocommerce_after_order_notes', [$this, 'add_wallet_field']);
        add_action('woocommerce_checkout_update_order_meta', [$this, 'save_wallet_address']);
        add_action('woocommerce_thankyou', [$this, 'verify_sol_payment']);
    }

    // Load JS for Phantom Wallet and localize API URL
    public function enqueue_scripts() {
        if (!function_exists('is_checkout') || !is_checkout()) {
            return;
        }
        wp_enqueue_script(
            'solana-web3',
            'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.95.4/lib/index.iife.min.js',
            [],
            '1.95.4',
            true
        );
        wp_enqueue_script(
            'zoo-solana-checkout',
            plugin_dir_url(__FILE__) . 'js/zoo-checkout.js',
            ['jquery', 'solana-web3'],
            '1.0.0',
            true
        );
        $api_base = rtrim(self::API_URL, '/');
        wp_localize_script('zoo-solana-checkout', 'zooCheckout', [
            'apiUrl'     => $api_base . '/verify',
            'payUrl'     => $api_base . '/pay',
            'zooMint'    => defined('ZOO_SOLANA_CHECKOUT_ZOO_MINT') ? ZOO_SOLANA_CHECKOUT_ZOO_MINT : self::ZOO_MINT,
            'shopWallet' => defined('ZOO_SOLANA_CHECKOUT_SHOP_WALLET') ? ZOO_SOLANA_CHECKOUT_SHOP_WALLET : self::SHOP_WALLET,
            'rpcUrl'     => defined('ZOO_SOLANA_CHECKOUT_RPC_URL') ? ZOO_SOLANA_CHECKOUT_RPC_URL : 'https://api.mainnet-beta.solana.com',
        ]);
    }

    // Add wallet input to checkout
    public function add_wallet_field($checkout) {
        echo '<div id="phantom-wallet-section">
            <p><strong>Connect Phantom Wallet to pay with ZOO token</strong></p>
            <button type="button" id="connect-wallet">Connect Wallet</button>
            <input type="hidden" name="wallet_address" id="wallet_address">
            <p id="wallet-status"></p>
        </div>';
    }

    // Save wallet address to order meta
    public function save_wallet_address($order_id) {
        if (isset($_POST['wallet_address'])) {
            update_post_meta($order_id, '_wallet_address', sanitize_text_field($_POST['wallet_address']));
        }
    }

    // Verify transaction with Render API
    public function verify_sol_payment($order_id) {
        $wallet = get_post_meta($order_id, '_wallet_address', true);
        if (!$wallet) return;

        $order = wc_get_order($order_id);
        $amount = $order->get_total();

        $response = wp_remote_post(self::API_URL.'/verify', [
            'headers' => ['Content-Type' => 'application/json'],
            'body' => json_encode([
                'wallet' => $wallet,
                'order_id' => $order_id,
                'amount' => $amount
            ]),
            'timeout' => 20
        ]);

        if (is_wp_error($response)) {
            $order->update_status('failed', 'ZOO payment verification failed: '.$response->get_error_message());
            return;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!isset($body['success']) || !$body['success']) {
            $order->update_status('failed', 'ZOO payment invalid');
        } else {
            $order->payment_complete();
        }
    }
}

new Zoo_Solana_Checkout();
