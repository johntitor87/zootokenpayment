<?php
/**
 * Plugin Name: Woo ZOO Solana Gateway
 * Description: WooCommerce gateway for ZOO Token (Solana) + Phantom Wallet. Payment options: Square | ZOO Token. See PAYMENT-FLOW.md.
 * Version: 1.0
 * Author: Your Name
 */

if (!defined('ABSPATH')) exit;

add_action('plugins_loaded', 'wcs_init_gateway', 11);
function wcs_init_gateway() {
    if (!class_exists('WC_Payment_Gateway')) return;

    include_once plugin_dir_path(__FILE__) . 'includes/class-wcs-gateway-zoo.php';

    add_filter('woocommerce_payment_gateways', function ($gateways) {
        $gateways[] = 'WC_Gateway_ZOO';
        return $gateways;
    });
}

// Enqueue frontend JS for Phantom Wallet
add_action('wp_enqueue_scripts', function () {
    if (!function_exists('is_checkout') || !is_checkout()) {
        return;
    }

    $opts = get_option('woocommerce_zoo_token_settings', []);
    $api_base = isset($opts['api_endpoint']) ? rtrim($opts['api_endpoint'], '/') : '';
    $api_endpoint = $api_base ? $api_base . '/pay' : 'https://your-render-api.com/verify-payment';

    wp_enqueue_script(
        'solana-web3',
        'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.95.4/lib/index.iife.min.js',
        [],
        '1.95.4',
        true
    );
    wp_enqueue_script(
        'zoo-wallet-js',
        plugin_dir_url(__FILE__) . 'assets/js/zoo-wallet.js',
        ['jquery', 'solana-web3'],
        '1.0',
        true
    );

    // Pass WooCommerce order info + API endpoint to JS
    global $wp;
    $order_id = null;
    $order_total = null;
    $order_key = '';

    if (isset(WC()->session) && WC()->session->get('order_awaiting_payment')) {
        $order_id = WC()->session->get('order_awaiting_payment');
        $order = wc_get_order($order_id);
        if ($order) {
            $order_total = (float) $order->get_total();
            $order_key = $order->get_order_key();
        }
    }

    if ($order_id === null && function_exists('is_wc_endpoint_url') && is_wc_endpoint_url('order-pay') && isset($_GET['key'])) {
        $order_id = absint(get_query_var('order-pay'));
        $order = wc_get_order($order_id);
        if ($order && $order->get_order_key() === sanitize_text_field(wp_unslash($_GET['key']))) {
            $order_total = (float) $order->get_total();
            $order_key = sanitize_text_field(wp_unslash($_GET['key']));
        } else {
            $order_id = null;
        }
    }

    $zoo_mint_default = 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3';
    wp_localize_script('zoo-wallet-js', 'zoo_ajax', [
        'ajax_url'     => admin_url('admin-ajax.php'),
        'api_endpoint' => $api_endpoint,
        'api_pay'      => $api_endpoint,
        'zoo_mint'     => isset($opts['zoo_mint']) ? $opts['zoo_mint'] : $zoo_mint_default,
        'shop_wallet'  => isset($opts['shop_wallet']) ? $opts['shop_wallet'] : '',
        'rpc_url'      => isset($opts['rpc_url']) ? $opts['rpc_url'] : 'https://api.mainnet-beta.solana.com',
        'order_id'     => $order_id,
        'order_amount' => $order_total,
        'order_total'  => $order_total,
        'order_key'    => $order_key,
    ]);
});
