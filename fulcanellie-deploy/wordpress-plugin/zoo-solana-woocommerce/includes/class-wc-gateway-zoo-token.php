<?php
/**
 * WooCommerce Payment Gateway: Pay with ZOO Token (Solana)
 *
 * Customers pay order total in ZOO tokens. At checkout they select this method;
 * on the order confirmation page they connect wallet and send ZOO to the store.
 */

defined('ABSPATH') || exit;

class WC_Gateway_ZOO_Token extends WC_Payment_Gateway {

    public function __construct() {
        $this->id                 = 'zoo_token';
        $this->icon               = '';
        $this->has_fields         = true;
        $this->method_title       = __('ZOO Token (Solana)', 'zoo-solana-woocommerce');
        $this->method_description  = __('Accept ZOO token payments. Customer pays the order total in ZOO on the order confirmation page.', 'zoo-solana-woocommerce');
        $this->supports           = array('products');

        $this->init_form_fields();
        $this->init_settings();

        $this->title       = $this->get_option('title', __('Pay with ZOO Token', 'zoo-solana-woocommerce'));
        $this->description = $this->get_option('description', __('Pay with your ZOO token (Solana). You will complete payment on the next page.', 'zoo-solana-woocommerce'));
        $this->enabled     = $this->get_option('enabled', 'no');
        $this->store_wallet = $this->get_option('zoo_store_wallet', '');
        $this->zoo_per_usd  = (float) $this->get_option('zoo_per_usd', 10);
        $this->mint_address  = $this->get_option('zoo_mint_address', 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3');

        add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
        add_action('woocommerce_thankyou_' . $this->id, array($this, 'thankyou_zoo_payment'), 10, 1);
        add_action('wp_ajax_zoo_verify_payment', array($this, 'ajax_verify_payment'));
        add_action('wp_ajax_nopriv_zoo_verify_payment', array($this, 'ajax_verify_payment'));
    }

    public function init_form_fields() {
        $this->form_fields = array(
            'enabled' => array(
                'title'   => __('Enable/Disable', 'zoo-solana-woocommerce'),
                'type'    => 'checkbox',
                'label'   => __('Enable ZOO Token payment', 'zoo-solana-woocommerce'),
                'default' => 'no',
            ),
            'title' => array(
                'title'       => __('Title', 'zoo-solana-woocommerce'),
                'type'        => 'text',
                'description' => __('Payment method title at checkout.', 'zoo-solana-woocommerce'),
                'default'     => __('Pay with ZOO Token', 'zoo-solana-woocommerce'),
            ),
            'description' => array(
                'title'       => __('Description', 'zoo-solana-woocommerce'),
                'type'        => 'textarea',
                'default'     => __('Pay with your ZOO token (Solana). You will complete payment on the next page.', 'zoo-solana-woocommerce'),
            ),
            'zoo_store_wallet' => array(
                'title'       => __('Store ZOO wallet address', 'zoo-solana-woocommerce'),
                'type'        => 'text',
                'description' => __('Solana wallet address that will receive ZOO payments. Must have a ZOO token account. Also set zooStoreWallet in your staking-config.json (Node API) to the same address.', 'zoo-solana-woocommerce'),
                'default'     => '',
            ),
            'zoo_per_usd' => array(
                'title'       => __('ZOO per 1 USD (fixed rate)', 'zoo-solana-woocommerce'),
                'type'        => 'number',
                'description' => __('Fixed conversion: how many ZOO = 1 USD (e.g. 10 means $50 = 500 ZOO). Use any number for devnet testing. On mainnet, update this when you want to change your accepted rate; dynamic/live pricing can be added later.', 'zoo-solana-woocommerce'),
                'default'     => '10',
                'min'         => 0.0001,
                'step'        => 0.01,
            ),
            'zoo_mint_address' => array(
                'title'       => __('ZOO mint address', 'zoo-solana-woocommerce'),
                'type'        => 'text',
                'description' => __('Solana mint address of the ZOO token.', 'zoo-solana-woocommerce'),
                'default'     => 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3',
            ),
        );
    }

    public function payment_fields() {
        if ($this->description) {
            echo wp_kses_post(wpautop(wptexturize($this->description)));
        }
        $total = WC()->cart ? WC()->cart->get_total('edit') : 0;
        $total_f = (float) $total;
        $zoo_amount = $this->zoo_per_usd > 0 ? round($total_f * $this->zoo_per_usd, 2) : 0;
        echo '<p class="zoo-checkout-summary">' . esc_html(sprintf(__('Order total: %s ZOO (at %s ZOO per 1 USD).', 'zoo-solana-woocommerce'), number_format($zoo_amount, 2), number_format($this->zoo_per_usd, 2))) . '</p>';
    }

    public function process_payment($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) {
            return array('result' => 'failure', 'messages' => __('Invalid order.', 'zoo-solana-woocommerce'));
        }

        $total = (float) $order->get_total();
        // Fixed rate for now; for mainnet, dynamic rate could be fetched here (e.g. from price API).
        $zoo_amount = $this->zoo_per_usd > 0 ? round($total * $this->zoo_per_usd, 2) : 0;

        $order->update_meta_data('_zoo_amount_zoo', $zoo_amount);
        $order->update_meta_data('_zoo_order_total_usd', $total);
        $order->set_status('pending', __('Awaiting ZOO token payment.', 'zoo-solana-woocommerce'));
        $order->save();

        return array(
            'result'   => 'success',
            'redirect' => $this->get_return_url($order),
        );
    }

    public function thankyou_zoo_payment($order_id) {
        $order = wc_get_order($order_id);
        if (!$order || $order->get_payment_method() !== 'zoo_token') {
            return;
        }
        if ($order->is_paid()) {
            echo '<p class="zoo-payment-done">' . esc_html__('Payment received. Thank you.', 'zoo-solana-woocommerce') . '</p>';
            return;
        }

        $zoo_amount = (float) $order->get_meta('_zoo_amount_zoo');
        $store_wallet = $this->get_option('zoo_store_wallet', '');
        if (!$store_wallet || $zoo_amount <= 0) {
            echo '<p class="zoo-payment-error">' . esc_html__('ZOO payment is not configured or order total is zero.', 'zoo-solana-woocommerce') . '</p>';
            return;
        }

        wp_enqueue_script('zoo-solana-wallet');
        // Buffer polyfill: @solana/web3.js expects Node's Buffer in browser (must run before Solana)
        wp_add_inline_script('zoo-solana-wallet', 'window.Buffer=window.Buffer||function(n){if(n instanceof Uint8Array)return n;if(typeof n==="number")return new Uint8Array(n);return new Uint8Array(0)};window.Buffer.from=window.Buffer.from||function(n){if(n instanceof ArrayBuffer)return new Uint8Array(n);if(Array.isArray(n))return new Uint8Array(n);if(n instanceof Uint8Array)return n;if(typeof n==="string")return new TextEncoder().encode(n);return new Uint8Array(0)};window.Buffer.isBuffer=window.Buffer.isBuffer||function(n){return n instanceof Uint8Array};', 'before');
        wp_enqueue_script('solana-web3', 'https://unpkg.com/@solana/web3.js@1.95.4/lib/index.iife.min.js', array('zoo-solana-wallet'), '1.95.4', true);
        wp_enqueue_script('zoo-solana-pay', ZOO_SOLANA_WC_PLUGIN_URL . 'assets/js/zoo-pay.js', array('zoo-solana-wallet', 'solana-web3'), ZOO_SOLANA_WC_VERSION, true);
        wp_localize_script('zoo-solana-pay', 'zooPay', array(
            'orderId'      => (string) $order_id,
            'orderKey'     => $order->get_order_key(),
            'amountZoo'    => $zoo_amount,
            'storeWallet'  => $store_wallet,
            'mintAddress'  => $this->mint_address,
            'ajaxUrl'      => admin_url('admin-ajax.php'),
            'nonce'        => wp_create_nonce('zoo_verify_payment'),
            'apiUrl'       => rtrim(get_option('zoo_staking_api_url', 'http://localhost:3001'), '/'),
        ));

        ?>
        <div id="zoo-pay-box" class="zoo-pay-box">
            <h3><?php esc_html_e('Pay with ZOO Token', 'zoo-solana-woocommerce'); ?></h3>
            <p><?php echo esc_html(sprintf(__('Send %s ZOO to complete this order.', 'zoo-solana-woocommerce'), number_format($zoo_amount, 2))); ?></p>
            <p><button type="button" class="button button-primary" id="zoo-pay-btn"><?php esc_html_e('Pay with Wallet', 'zoo-solana-woocommerce'); ?></button></p>
            <p class="zoo-pay-error" id="zoo-pay-error" style="display:none;"></p>
            <p class="zoo-pay-success" id="zoo-pay-success" style="display:none;"><?php esc_html_e('Payment verified. Refreshing...', 'zoo-solana-woocommerce'); ?></p>
        </div>
        <?php
    }

    public function ajax_verify_payment() {
        check_ajax_referer('zoo_verify_payment', 'nonce');

        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        $order_key = isset($_POST['order_key']) ? sanitize_text_field(wp_unslash($_POST['order_key'])) : '';
        $signature = isset($_POST['signature']) ? sanitize_text_field(wp_unslash($_POST['signature'])) : '';
        $wallet = isset($_POST['wallet']) ? sanitize_text_field(wp_unslash($_POST['wallet'])) : '';

        if (!$order_id || !$order_key || !$signature || !$wallet) {
            wp_send_json_error(array('message' => __('Missing parameters.', 'zoo-solana-woocommerce')));
        }

        $order = wc_get_order($order_id);
        if (!$order || $order->get_order_key() !== $order_key || $order->get_payment_method() !== 'zoo_token') {
            wp_send_json_error(array('message' => __('Invalid order.', 'zoo-solana-woocommerce')));
        }
        if ($order->is_paid()) {
            wp_send_json_success(array('message' => __('Already paid.', 'zoo-solana-woocommerce')));
        }

        $amount_zoo = (float) $order->get_meta('_zoo_amount_zoo');
        $api_url = rtrim(get_option('zoo_staking_api_url', 'http://localhost:3001'), '/');
        $response = wp_remote_post($api_url . '/api/zoo/verify-payment', array(
            'timeout' => 30,
            'headers' => array('Content-Type' => 'application/json'),
            'body'    => wp_json_encode(array(
                'order_id'      => $order_id,
                'signature'     => $signature,
                'payer_wallet'  => $wallet,
                'amount_zoo'    => $amount_zoo,
            )),
        ));

        if (is_wp_error($response)) {
            $err_msg = $response->get_error_message();
            if (strpos($api_url, 'localhost') !== false) {
                $err_msg .= ' ' . __('Staking API URL is set to localhost. If this site is on another server, use the URL where your Node API runs (e.g. your server’s public URL) in Settings → ZOO Staking.', 'zoo-solana-woocommerce');
            }
            wp_send_json_error(array('message' => $err_msg));
        }
        $code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if ($code !== 200 || empty($body['success'])) {
            $msg = isset($body['error']) ? $body['error'] : __('Verification failed.', 'zoo-solana-woocommerce');
            if ($code === 0 || $code >= 500) {
                $msg .= ' ' . __('The verification server may be down or unreachable. Check Settings → ZOO Staking (API URL).', 'zoo-solana-woocommerce');
            }
            wp_send_json_error(array('message' => $msg));
        }

        $order->payment_complete();
        $order->add_order_note(sprintf(__('ZOO payment verified. Tx: %s', 'zoo-solana-woocommerce'), $signature));
        $order->save();

        wp_send_json_success(array('message' => __('Payment confirmed.', 'zoo-solana-woocommerce')));
    }
}
