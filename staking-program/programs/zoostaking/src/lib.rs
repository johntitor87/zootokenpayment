use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Zoostaking1111111111111111111111111111111");

#[program]
pub mod zoostaking {
    use super::*;

    /// Initialize the staking vault (PDA)
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.mint = ctx.accounts.mint.key();
        vault.bump = ctx.bumps.vault;
        
        msg!("Vault initialized with authority: {}", vault.authority);
        Ok(())
    }

    /// Stake tokens - Lock tokens in the vault
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        // Transfer tokens from user to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Update stake account
        if stake_account.amount == 0 {
            // New stake
            stake_account.user = ctx.accounts.user.key();
            stake_account.amount = amount;
            stake_account.timestamp = clock.unix_timestamp;
            stake_account.unstake_timestamp = None;
            stake_account.status = StakeStatus::Active;
            stake_account.penalty_applied = false;
        } else {
            // Additional stake - reset unstake request if exists
            stake_account.amount = stake_account.amount.checked_add(amount)
                .ok_or(ErrorCode::Overflow)?;
            if stake_account.status == StakeStatus::Unstaking {
                // User is adding more tokens, cancel unstake request
                stake_account.status = StakeStatus::Active;
                stake_account.unstake_timestamp = None;
            }
        }

        emit!(StakeEvent {
            user: ctx.accounts.user.key(),
            amount,
            total_staked: stake_account.amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Request unstake - Start 2-day lock period
    pub fn request_unstake(ctx: Context<RequestUnstake>) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;
        
        require!(
            stake_account.status == StakeStatus::Active,
            ErrorCode::StakeNotActive
        );
        
        require!(
            stake_account.amount > 0,
            ErrorCode::NoStakeFound
        );

        // Check if staking for less than 3 days (penalty applies)
        let staking_duration = clock.unix_timestamp - stake_account.timestamp;
        let three_days = 3 * 24 * 60 * 60; // 3 days in seconds
        
        if staking_duration < three_days {
            stake_account.penalty_applied = true;
        }

        // Set unstake timestamp (2-day lock starts now)
        stake_account.unstake_timestamp = Some(clock.unix_timestamp);
        stake_account.status = StakeStatus::Unstaking;

        emit!(UnstakeRequestEvent {
            user: ctx.accounts.user.key(),
            amount: stake_account.amount,
            unlock_timestamp: clock.unix_timestamp + (2 * 24 * 60 * 60), // 2 days
            penalty_applied: stake_account.penalty_applied,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Complete unstake - Withdraw tokens after 2-day lock period
    pub fn complete_unstake(ctx: Context<CompleteUnstake>) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;
        
        require!(
            stake_account.status == StakeStatus::Unstaking,
            ErrorCode::NotUnstaking
        );
        
        require!(
            stake_account.unstake_timestamp.is_some(),
            ErrorCode::NoUnstakeRequest
        );

        let unstake_timestamp = stake_account.unstake_timestamp.unwrap();
        let two_days = 2 * 24 * 60 * 60; // 2 days in seconds
        let unlock_time = unstake_timestamp + two_days;

        require!(
            clock.unix_timestamp >= unlock_time,
            ErrorCode::LockPeriodNotOver
        );

        let amount = stake_account.amount;
        let penalty_amount = if stake_account.penalty_applied {
            // Apply 5% penalty if unstaking within 3 days
            amount * 5 / 100
        } else {
            0
        };

        let transfer_amount = amount.checked_sub(penalty_amount)
            .ok_or(ErrorCode::Overflow)?;

        // Transfer tokens from vault back to user (minus penalty if applicable)
        let seeds = &[
            b"vault",
            ctx.accounts.vault.mint.as_ref(),
            &[ctx.accounts.vault.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, transfer_amount)?;

        // Update stake account - access revoked immediately
        stake_account.amount = 0;
        stake_account.status = StakeStatus::Unstaked;
        stake_account.unstake_timestamp = None;

        emit!(UnstakeCompleteEvent {
            user: ctx.accounts.user.key(),
            amount: transfer_amount,
            penalty: penalty_amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Get stake info (read-only, no account needed)
    pub fn get_stake_info(ctx: Context<GetStakeInfo>) -> Result<StakeInfo> {
        let stake_account = &ctx.accounts.stake_account;
        let clock = Clock::get()?;
        
        // Calculate unlock time if unstaking
        let unlock_timestamp = if stake_account.status == StakeStatus::Unstaking {
            stake_account.unstake_timestamp.map(|ts| ts + (2 * 24 * 60 * 60))
        } else {
            None
        };
        
        // Determine tier
        let tier = if stake_account.amount >= 1000 * 1_000_000_000 {
            3 // Tier 3: 1000+ tokens
        } else if stake_account.amount >= 500 * 1_000_000_000 {
            2 // Tier 2: 500+ tokens
        } else if stake_account.amount >= 250 * 1_000_000_000 {
            1 // Tier 1: 250+ tokens
        } else {
            0 // No tier
        };
        
        Ok(StakeInfo {
            user: stake_account.user,
            amount: stake_account.amount,
            timestamp: stake_account.timestamp,
            unstake_timestamp: stake_account.unstake_timestamp,
            unlock_timestamp,
            status: stake_account.status,
            tier,
            penalty_applied: stake_account.penalty_applied,
        })
    }

    /// Create a proposal (admin-only)
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        proposal_id: u64,
        voting_start: i64,
        voting_end: i64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        require!(voting_end > voting_start, ErrorCode::VotingClosed);

        let proposal = &mut ctx.accounts.proposal;
        proposal.authority = ctx.accounts.authority.key();
        proposal.vault = ctx.accounts.vault.key();
        proposal.mint = ctx.accounts.vault.mint;
        proposal.proposal_id = proposal_id;
        proposal.voting_start = voting_start;
        proposal.voting_end = voting_end;
        proposal.yes_votes = 0;
        proposal.no_votes = 0;
        proposal.status = ProposalStatus::Open;
        proposal.bump = ctx.bumps.proposal;

        emit!(ProposalCreatedEvent {
            proposal: proposal.key(),
            proposal_id,
            voting_start,
            voting_end,
        });

        // Optional: allow start in the past to open immediately
        require!(voting_end > clock.unix_timestamp, ErrorCode::VotingClosed);

        Ok(())
    }

    /// Cast a vote (weight = current staked amount, only Active stakes)
    pub fn cast_vote(ctx: Context<CastVote>, choice_yes: bool) -> Result<()> {
        let clock = Clock::get()?;
        let proposal = &mut ctx.accounts.proposal;
        let stake_account = &ctx.accounts.stake_account;

        require!(proposal.status == ProposalStatus::Open, ErrorCode::ProposalNotOpen);
        require!(clock.unix_timestamp >= proposal.voting_start, ErrorCode::VotingNotStarted);
        require!(clock.unix_timestamp <= proposal.voting_end, ErrorCode::VotingClosed);

        require!(
            stake_account.status == StakeStatus::Active && stake_account.amount > 0,
            ErrorCode::NoStakeForVote
        );

        // Record vote weight = current staked amount
        let weight = stake_account.amount;

        let vote_record = &mut ctx.accounts.vote_record;
        vote_record.proposal = proposal.key();
        vote_record.voter = ctx.accounts.voter.key();
        vote_record.weight = weight;
        vote_record.choice = choice_yes;
        vote_record.voted_at = clock.unix_timestamp;
        vote_record.bump = ctx.bumps.vote_record;

        if choice_yes {
            proposal.yes_votes = proposal.yes_votes.checked_add(weight).ok_or(ErrorCode::Overflow)?;
        } else {
            proposal.no_votes = proposal.no_votes.checked_add(weight).ok_or(ErrorCode::Overflow)?;
        }

        emit!(VoteCastEvent {
            proposal: proposal.key(),
            voter: ctx.accounts.voter.key(),
            weight,
            choice: choice_yes,
        });

        Ok(())
    }

    /// Finalize a proposal after voting window ends
    pub fn finalize_proposal(ctx: Context<FinalizeProposal>) -> Result<()> {
        let clock = Clock::get()?;
        let proposal = &mut ctx.accounts.proposal;

        require!(proposal.status == ProposalStatus::Open, ErrorCode::ProposalNotOpen);
        require!(clock.unix_timestamp > proposal.voting_end, ErrorCode::VotingClosed);

        proposal.status = ProposalStatus::Finalized;

        emit!(ProposalFinalizedEvent {
            proposal: proposal.key(),
            yes_votes: proposal.yes_votes,
            no_votes: proposal.no_votes,
            finalized_at: clock.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 1,
        seeds = [b"vault", mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub mint: Account<'info, anchor_spl::token::Mint>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(
        seeds = [b"vault", vault.mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8 + 8 + 1 + 8 + 1 + 1, // user + amount + timestamp + status + unstake_timestamp + penalty
        seeds = [b"stake", vault.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == vault.mint
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault_token_account.mint == vault.mint,
        constraint = vault_token_account.owner == vault.key()
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestUnstake<'info> {
    #[account(
        seeds = [b"vault", vault.mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"stake", vault.key().as_ref(), user.key().as_ref()],
        bump,
        constraint = stake_account.user == user.key()
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompleteUnstake<'info> {
    #[account(
        seeds = [b"vault", vault.mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"stake", vault.key().as_ref(), user.key().as_ref()],
        bump,
        constraint = stake_account.user == user.key()
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == vault.mint
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault_token_account.mint == vault.mint,
        constraint = vault_token_account.owner == vault.key()
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetStakeInfo<'info> {
    #[account(
        seeds = [b"vault", vault.mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        seeds = [b"stake", vault.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,

    /// CHECK: User to check (can be any address)
    pub user: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(
        seeds = [b"vault", vault.mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1, // Proposal
        seeds = [b"proposal", vault.key().as_ref(), &proposal_id.to_le_bytes()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(mut)]
    pub authority: Signer<'info>, // admin

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(
        seeds = [b"vault", vault.mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"proposal", vault.key().as_ref(), &proposal.proposal_id.to_le_bytes()],
        bump = proposal.bump,
        constraint = proposal.vault == vault.key(),
        constraint = proposal.mint == vault.mint,
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(
        init,
        payer = voter,
        space = 8 + 32 + 32 + 8 + 1 + 8 + 1, // VoteRecord
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump,
    )]
    pub vote_record: Account<'info, VoteRecord>,

    #[account(
        seeds = [b"stake", vault.key().as_ref(), voter.key().as_ref()],
        bump,
        constraint = stake_account.user == voter.key()
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut)]
    pub voter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeProposal<'info> {
    #[account(
        seeds = [b"vault", vault.mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"proposal", vault.key().as_ref(), &proposal.proposal_id.to_le_bytes()],
        bump = proposal.bump,
        constraint = proposal.vault == vault.key(),
        constraint = proposal.mint == vault.mint,
    )]
    pub proposal: Account<'info, Proposal>,

    /// Anyone can finalize after end time
    pub closer: Signer<'info>,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub bump: u8,
}

#[account]
pub struct StakeAccount {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64, // When staked
    pub unstake_timestamp: Option<i64>, // When unstake was requested
    pub status: StakeStatus,
    pub penalty_applied: bool, // If unstaked within 3 days
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum StakeStatus {
    Active,
    Unstaking, // 2-day lock period
    Unstaked,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ProposalStatus {
    Open,
    Finalized,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct StakeInfo {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub unstake_timestamp: Option<i64>,
    pub unlock_timestamp: Option<i64>,
    pub status: StakeStatus,
    pub tier: u8, // 0 = no tier, 1 = 250+, 2 = 500+, 3 = 1000+
    pub penalty_applied: bool,
}

#[account]
pub struct Proposal {
    pub authority: Pubkey,      // Admin who can create/cancel
    pub vault: Pubkey,          // Vault binding to mint/context
    pub mint: Pubkey,           // Token mint for this staking system
    pub proposal_id: u64,       // User-supplied ID
    pub voting_start: i64,      // Unix timestamp start
    pub voting_end: i64,        // Unix timestamp end
    pub yes_votes: u64,         // Sum of staked weight for YES
    pub no_votes: u64,          // Sum of staked weight for NO
    pub status: ProposalStatus, // Open / Finalized / Cancelled
    pub bump: u8,
}

#[account]
pub struct VoteRecord {
    pub proposal: Pubkey, // Proposal this vote belongs to
    pub voter: Pubkey,    // Wallet that voted
    pub weight: u64,      // Stake weight (lamports of token units)
    pub choice: bool,     // true = YES, false = NO
    pub voted_at: i64,    // Timestamp vote cast
    pub bump: u8,
}

#[event]
pub struct StakeEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub total_staked: u64,
    pub timestamp: i64,
}

#[event]
pub struct UnstakeRequestEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub unlock_timestamp: i64,
    pub penalty_applied: bool,
    pub timestamp: i64,
}

#[event]
pub struct UnstakeCompleteEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub penalty: u64,
    pub timestamp: i64,
}

#[event]
pub struct ProposalCreatedEvent {
    pub proposal: Pubkey,
    pub proposal_id: u64,
    pub voting_start: i64,
    pub voting_end: i64,
}

#[event]
pub struct VoteCastEvent {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub weight: u64,
    pub choice: bool,
}

#[event]
pub struct ProposalFinalizedEvent {
    pub proposal: Pubkey,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub finalized_at: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Stake account is not active")]
    StakeNotActive,
    #[msg("No stake found")]
    NoStakeFound,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Not in unstaking status")]
    NotUnstaking,
    #[msg("No unstake request found")]
    NoUnstakeRequest,
    #[msg("2-day lock period not over")]
    LockPeriodNotOver,
    #[msg("Proposal is not open")]
    ProposalNotOpen,
    #[msg("Voting window not started")]
    VotingNotStarted,
    #[msg("Voting window closed")]
    VotingClosed,
    #[msg("Already voted on this proposal")]
    AlreadyVoted,
    #[msg("No active stake for voting")]
    NoStakeForVote,
}





