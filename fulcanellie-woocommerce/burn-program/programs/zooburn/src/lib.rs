use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Token, TokenAccount, Mint};

declare_id!("Zooburn1111111111111111111111111111111111");

#[program]
pub mod zooburn {
    use super::*;

    /// Initialize burn configuration for a product/action
    pub fn initialize_burn_config(
        ctx: Context<InitializeBurnConfig>,
        product_id: String,
        burn_amount: u64,
        is_active: bool,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.mint = ctx.accounts.mint.key();
        config.product_id = product_id;
        config.burn_amount = burn_amount;
        config.is_active = is_active;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Update burn configuration (only authority)
    pub fn update_burn_config(
        ctx: Context<UpdateBurnConfig>,
        burn_amount: Option<u64>,
        is_active: Option<bool>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        
        if let Some(amount) = burn_amount {
            config.burn_amount = amount;
        }
        
        if let Some(active) = is_active {
            config.is_active = active;
        }
        
        Ok(())
    }

    /// Controlled burn with verification
    pub fn controlled_burn(
        ctx: Context<ControlledBurn>,
        product_id: String,
        confirmation: u64, // Confirmation nonce to prevent replay
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        
        // Verify product ID matches
        require!(
            config.product_id == product_id,
            ErrorCode::InvalidProductId
        );
        
        // Verify burn is active
        require!(
            config.is_active,
            ErrorCode::BurnNotActive
        );
        
        // Verify burn amount matches
        require!(
            config.burn_amount > 0,
            ErrorCode::InvalidBurnAmount
        );
        
        // Verify user has enough tokens
        require!(
            ctx.accounts.user_token_account.amount >= config.burn_amount,
            ErrorCode::InsufficientBalance
        );
        
        // Check if confirmation was already used (prevent replay)
        // In production, use a PDA to track used confirmations
        
        // Perform the burn via CPI
        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::burn(cpi_ctx, config.burn_amount)?;
        
        // Emit event for tracking
        emit!(BurnEvent {
            user: ctx.accounts.user.key(),
            product_id: product_id.clone(),
            amount: config.burn_amount,
            confirmation,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Burn with reward (e.g., unlock product, receive NFT)
    pub fn burn_with_reward(
        ctx: Context<BurnWithReward>,
        product_id: String,
        confirmation: u64,
    ) -> Result<()> {
        // First perform the burn
        let config = &ctx.accounts.config;
        
        require!(
            config.product_id == product_id,
            ErrorCode::InvalidProductId
        );
        
        require!(
            config.is_active,
            ErrorCode::BurnNotActive
        );
        
        require!(
            ctx.accounts.user_token_account.amount >= config.burn_amount,
            ErrorCode::InsufficientBalance
        );
        
        // Burn tokens
        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::burn(cpi_ctx, config.burn_amount)?;
        
        // Emit event - backend can listen and provide reward
        emit!(BurnWithRewardEvent {
            user: ctx.accounts.user.key(),
            product_id: product_id.clone(),
            amount: config.burn_amount,
            confirmation,
            reward_type: ctx.accounts.reward_account.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Refund burn (if purchase failed) - only callable by authority
    pub fn refund_burn(
        ctx: Context<RefundBurn>,
        original_burn_signature: String,
        refund_amount: u64,
    ) -> Result<()> {
        // Verify authority
        require!(
            ctx.accounts.authority.key() == ctx.accounts.config.authority,
            ErrorCode::Unauthorized
        );
        
        // Mint tokens back to user (requires mint authority)
        // This would need mint authority or a mint authority PDA
        
        emit!(RefundEvent {
            user: ctx.accounts.user.key(),
            original_signature: original_burn_signature,
            refund_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(product_id: String)]
pub struct InitializeBurnConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 4 + product_id.len() + 8 + 1 + 1,
        seeds = [b"burn_config", mint.key().as_ref(), product_id.as_bytes()],
        bump
    )]
    pub config: Account<'info, BurnConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub mint: Account<'info, Mint>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateBurnConfig<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, BurnConfig>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(product_id: String, confirmation: u64)]
pub struct ControlledBurn<'info> {
    #[account(
        seeds = [b"burn_config", mint.key().as_ref(), product_id.as_bytes()],
        bump = config.bump,
        constraint = config.is_active @ ErrorCode::BurnNotActive
    )]
    pub config: Account<'info, BurnConfig>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::InvalidTokenAccount,
        constraint = user_token_account.mint == config.mint.key() @ ErrorCode::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(product_id: String, confirmation: u64)]
pub struct BurnWithReward<'info> {
    #[account(
        seeds = [b"burn_config", mint.key().as_ref(), product_id.as_bytes()],
        bump = config.bump,
        constraint = config.is_active @ ErrorCode::BurnNotActive
    )]
    pub config: Account<'info, BurnConfig>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::InvalidTokenAccount,
        constraint = user_token_account.mint == config.mint.key() @ ErrorCode::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Reward account (NFT, product unlock, etc.)
    pub reward_account: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RefundBurn<'info> {
    #[account(
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, BurnConfig>,
    
    pub authority: Signer<'info>,
    
    /// CHECK: User to refund
    pub user: UncheckedAccount<'info>,
    
    pub mint: Account<'info, Mint>,
    
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct BurnConfig {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub product_id: String,
    pub burn_amount: u64,
    pub is_active: bool,
    pub bump: u8,
}

#[event]
pub struct BurnEvent {
    pub user: Pubkey,
    pub product_id: String,
    pub amount: u64,
    pub confirmation: u64,
    pub timestamp: i64,
}

#[event]
pub struct BurnWithRewardEvent {
    pub user: Pubkey,
    pub product_id: String,
    pub amount: u64,
    pub confirmation: u64,
    pub reward_type: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RefundEvent {
    pub user: Pubkey,
    pub original_signature: String,
    pub refund_amount: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid product ID")]
    InvalidProductId,
    #[msg("Burn is not active for this product")]
    BurnNotActive,
    #[msg("Invalid burn amount")]
    InvalidBurnAmount,
    #[msg("Insufficient token balance")]
    InsufficientBalance,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Invalid mint")]
    InvalidMint,
}






