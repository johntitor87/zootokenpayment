<?php
/**
 * WooCommerce Hooks for Hard Gating Staking
 * 
 * Add these to your WordPress theme's functions.php or a custom plugin
 */

/**
 * Filter products by visibility (Tier 2+ required)
 */
add_filter('woocommerce_product_is_visible', 'zoo_check_product_visibility', 10, 2);

function zoo_check_product_visibility($visible, $product_id) {
    // Get user's wallet address from session/cookie
    $wallet_address = zoo_get_user_wallet();
    
    if (!$wallet_address) {
        // No wallet connected - hide gated products
        if (zoo_is_gated_product($product_id)) {
            return false;
        }
        return $visible;
    }
    
    // Check stake via API
    $stake_status = zoo_get_stake_status($wallet_address);
    
    if (!$stake_status || !$stake_status['can_see_products']) {
        // Hide product if user doesn't have Tier 2+
        if (zoo_is_gated_product($product_id)) {
            return false;
        }
    }
    
    return $visible;
}

/**
 * Validate checkout permission (Tier 2+ required)
 */
add_action('woocommerce_checkout_process', 'zoo_validate_checkout_permission');

function zoo_validate_checkout_permission() {
    $wallet_address = zoo_get_user_wallet();
    
    if (!$wallet_address) {
        wc_add_notice('Please connect your wallet to checkout.', 'error');
        return;
    }
    
    $stake_status = zoo_get_stake_status($wallet_address);
    
    if (!$stake_status || !$stake_status['can_checkout']) {
        wc_add_notice('You need to stake at least 500 ZOO tokens to checkout. Current tier: ' . ($stake_status['tier'] ?? 0), 'error');
    }
    
    // Check if access was revoked (unstaking)
    if ($stake_status && $stake_status['access_revoked']) {
        wc_add_notice('Your access has been revoked. Please complete your unstake or stake again.', 'error');
    }
}

/**
 * Apply tiered discounts
 */
add_action('woocommerce_cart_calculate_fees', 'zoo_apply_staking_discount');

function zoo_apply_staking_discount() {
    $wallet_address = zoo_get_user_wallet();
    
    if (!$wallet_address) {
        return;
    }
    
    $stake_status = zoo_get_stake_status($wallet_address);
    
    if ($stake_status && $stake_status['discount_percent'] > 0) {
        $cart_total = WC()->cart->get_subtotal();
        $discount = ($cart_total * $stake_status['discount_percent']) / 100;
        
        WC()->cart->add_fee(
            sprintf('Staking Discount (Tier %d - %d%%)', $stake_status['tier'], $stake_status['discount_percent']),
            -$discount
        );
    }
}

/**
 * Filter exclusive products (Tier 3 only)
 */
add_filter('woocommerce_product_is_visible', 'zoo_check_exclusive_access', 20, 2);

function zoo_check_exclusive_access($visible, $product_id) {
    if (!zoo_is_exclusive_product($product_id)) {
        return $visible;
    }
    
    $wallet_address = zoo_get_user_wallet();
    
    if (!$wallet_address) {
        return false;
    }
    
    $stake_status = zoo_get_stake_status($wallet_address);
    
    if (!$stake_status || !$stake_status['has_exclusive_access']) {
        return false;
    }
    
    return $visible;
}

/**
 * Helper: Get user's wallet address
 */
function zoo_get_user_wallet() {
    // Get from session, cookie, or user meta
    return isset($_SESSION['zoo_wallet_address']) 
        ? $_SESSION['zoo_wallet_address'] 
        : get_user_meta(get_current_user_id(), 'zoo_wallet_address', true);
}

/**
 * Helper: Get stake status from API
 */
function zoo_get_stake_status($wallet_address) {
    $api_url = get_option('zoo_staking_api_url', 'http://localhost:3000/api/staking/status');
    
    $response = wp_remote_get($api_url . '?user_address=' . urlencode($wallet_address));
    
    if (is_wp_error($response)) {
        return null;
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    return $data['status'] ?? null;
}

/**
 * Helper: Check if product is gated
 */
function zoo_is_gated_product($product_id) {
    // Check product meta or category
    return get_post_meta($product_id, '_zoo_gated', true) === 'yes';
}

/**
 * Helper: Check if product is exclusive (Tier 3)
 */
function zoo_is_exclusive_product($product_id) {
    return get_post_meta($product_id, '_zoo_exclusive', true) === 'yes';
}


