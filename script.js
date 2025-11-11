// Solana connection and wallet state
let walletConnected = false;
let walletAddress = null;
let provider = null;

// Presale destination address
const PRESALE_ADDRESS = 'FD95zJz6dxKd4X2e4gSGqWHqeo8g1SYQfGHEH3hQaTrp';

// Progress tracking configuration
const PRESALE_CONFIG = {
    targetAmount: 1000, // Target SOL amount
    startDate: new Date('2025-01-01'), // When presale started (for historical data)
    endDate: new Date(2025, 9, 30, 23, 59, 59), // Presale end date
    refreshInterval: 30000, // Update every 30 seconds
    solPriceUpdateInterval: 300000 // Update SOL price every 5 minutes
};

// Progress tracking state
let progressData = {
    totalRaised: 0,
    totalRaisedUSD: 0,
    contributorCount: 0,
    percentage: 0,
    solPrice: 0,
    lastUpdate: null
};

// Solana RPC connection for tracking
const SOLANA_RPC_ENDPOINTS = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana'
];
let currentRPCIndex = 0;

// USDT and USDC token mint addresses on Solana mainnet
const TOKEN_ADDRESSES = {
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT SPL Token
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'  // USDC SPL Token
};

// Create twinkling stars
const starsContainer = document.getElementById('stars');
for (let i = 0; i < 100; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.width = Math.random() * 3 + 'px';
    star.style.height = star.style.width;
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 3 + 's';
    starsContainer.appendChild(star);
}

// Mobile menu toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.getElementById('navLinks');

mobileMenuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    // Add/remove class for hamburger to X transformation
    mobileMenuBtn.classList.toggle("menu-open");
});

navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        // Remove the X transformation when menu closes
        mobileMenuBtn.classList.remove("menu-open");
        navLinks.classList.remove('active');
    });
});

// Wallet Connection
const walletConnectBtn = document.getElementById('walletConnectBtn');
const buyButton = document.getElementById('buyButton');

// Handle nav wallet button
walletConnectBtn.addEventListener('click', async () => {
    if (walletConnected) {
        disconnectWallet();
    } else {
        await connectWallet();
    }
});

// Handle buy button (dual purpose: connect wallet / buy tokens)
buyButton.addEventListener('click', async function () {
    if (!walletConnected) {
        // If wallet not connected, connect it
        await connectWallet();
        return;
    }

    // If wallet is connected, proceed with purchase
    const payAmount = payAmountInput.value;
    const tokensReceived = document.getElementById('tokensReceived').value;

    if (!payAmount || payAmount <= 0) {
        showError('Please enter a valid amount!');
        return;
    }

    // Process transfer based on currency
    if (selectedCurrency === 'SOL') {
        await transferSOL(payAmount, tokensReceived);
    } else if (selectedCurrency === 'USDT' || selectedCurrency === 'USDC') {
        await transferToken(selectedCurrency, payAmount, tokensReceived);
    }
});

async function connectWallet() {
    try {
        // Check if we're on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            await connectMobileWallet();
        } else {
            await connectDesktopWallet();
        }
    } catch (err) {
        console.error('Wallet connection error:', err);
        showError('Failed to connect wallet. Please try again.');
    }
}

async function connectDesktopWallet() {
    if (!window.solana || !window.solana.isPhantom) {
        showError('Phantom wallet not detected. Please install Phantom wallet from phantom.app');
        return;
    }

    const resp = await window.solana.connect();
    provider = window.solana;
    walletAddress = resp.publicKey.toString();
    walletConnected = true;
    updateWalletButton();
    console.log('Connected to wallet:', walletAddress);
}

async function connectMobileWallet() {
    // Wait for potential wallet injection
    await new Promise(resolve => setTimeout(resolve, 200));

    // Try multiple detection methods
    if (window.solana && (window.solana.isPhantom || window.solana.isConnected !== undefined)) {
        try {
            const resp = await window.solana.connect();
            provider = window.solana;
            walletAddress = resp.publicKey.toString();
            walletConnected = true;
            updateWalletButton();
            console.log('Connected to mobile wallet:', walletAddress);
            return;
        } catch (error) {
            console.log('Mobile wallet connection failed:', error);
        }
    }

    // Check for Phantom in-app browser
    if (window.phantom && window.phantom.solana) {
        try {
            const resp = await window.phantom.solana.connect();
            provider = window.phantom.solana;
            walletAddress = resp.publicKey.toString();
            walletConnected = true;
            updateWalletButton();
            console.log('Connected via Phantom in-app browser');
            return;
        } catch (error) {
            console.log('Phantom in-app connection failed:', error);
        }
    }

    // If no wallet detected, show mobile instructions
    showMobileWalletInstructions();
}

function showMobileWalletInstructions() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(11, 19, 43, 0.95); backdrop-filter: blur(20px);
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        z-index: 10001; padding: 40px 20px; text-align: center;
    `;

    const currentUrl = encodeURIComponent(window.location.href);
    const phantomAppUrl = `https://phantom.app/ul/browse/${currentUrl}`;

    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, rgba(31, 40, 51, 0.95) 0%, rgba(11, 19, 43, 0.95) 100%);
            border: 2px solid rgba(244, 185, 66, 0.4); border-radius: 20px; padding: 40px 30px;
            max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        ">
            <div style="font-size: 60px; margin-bottom: 20px;">👛</div>
            <h3 style="color: #F4B942; font-size: 24px; margin-bottom: 15px; font-weight: bold;">
                Connect Your Wallet
            </h3>
            <p style="color: #EDEDED; font-size: 16px; line-height: 1.6; margin-bottom: 25px; opacity: 0.9;">
                To use LynxCoin on mobile, please use the Phantom wallet app.
            </p>
            <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
                <button onclick="window.open('${phantomAppUrl}', '_blank')" style="
                    background: linear-gradient(135deg, #F4B942 0%, #E09F3E 100%); color: #0B132B; border: none;
                    padding: 18px 24px; border-radius: 15px; font-size: 16px; font-weight: bold; cursor: pointer;
                    box-shadow: 0 4px 15px rgba(244, 185, 66, 0.3); transition: all 0.3s ease;
                ">
                    📱 Open in Phantom App
                </button>
                <button onclick="window.open('https://phantom.app/download', '_blank')" style="
                    background: transparent; color: #3EC1D3; border: 2px solid #3EC1D3;
                    padding: 16px 24px; border-radius: 15px; font-size: 16px; font-weight: bold; cursor: pointer;
                ">
                    📥 Download Phantom
                </button>
            </div>
            <div style="margin: 20px 0; padding: 15px; background: rgba(62, 193, 211, 0.1); border-radius: 12px; border-left: 4px solid #3EC1D3;">
                <p style="color: #3EC1D3; font-size: 14px; margin: 0; font-weight: 600;">
                    💡 After installing Phantom, open this page in the Phantom browser to connect!
                </p>
            </div>
            <button onclick="this.closest('.mobile-wallet-modal').remove()" style="
                background: rgba(255, 255, 255, 0.1); color: #EDEDED; border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 12px 24px; border-radius: 12px; font-size: 14px; cursor: pointer; width: 100%;
            ">
                ✕ Close
            </button>
        </div>
    `;

    modal.className = 'mobile-wallet-modal';
    document.body.appendChild(modal);

    // Auto-detect wallet connection every 2 seconds
    const detectInterval = setInterval(async () => {
        if (!modal.parentNode) {
            clearInterval(detectInterval);
            return;
        }

        if (window.solana && (window.solana.isPhantom || window.solana.isConnected !== undefined)) {
            try {
                modal.remove();
                clearInterval(detectInterval);
                await connectMobileWallet();
            } catch (error) {
                console.log('Auto-detection failed');
            }
        }
    }, 2000);

    // Auto-remove after 60 seconds
    setTimeout(() => {
        if (modal && modal.parentNode) {
            modal.remove();
            clearInterval(detectInterval);
        }
    }, 60000);
}

// Enhanced wallet detection on page load for mobile
document.addEventListener('DOMContentLoaded', () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        // Wait for wallet injection on mobile
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds

        const checkForWallet = () => {
            if (window.solana && (window.solana.isPhantom || window.solana.isConnected !== undefined)) {
                console.log('Mobile wallet detected on page load');
                return;
            }

            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(checkForWallet, 100);
            }
        };

        checkForWallet();
    }
});

function disconnectWallet() {
    if (provider) {
        provider.disconnect();
    }
    walletConnected = false;
    walletAddress = null;
    provider = null;
    updateWalletButton();
}

function updateWalletButton() {
    const walletText = walletConnectBtn.querySelector('.wallet-text');
    const buttonText = buyButton.querySelector('.button-text');
    const walletIcon = buyButton.querySelector('.wallet-icon');

    if (walletConnected && walletAddress) {
        // Update nav wallet button
        walletText.textContent = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        walletConnectBtn.classList.add('connected');

        // Update buy button to show buy mode
        buttonText.textContent = 'BUY NOW';
        walletIcon.textContent = '🚀';
        buyButton.classList.add('connected');
    } else {
        // Reset nav wallet button
        walletText.textContent = 'Connect Wallet';
        walletConnectBtn.classList.remove('connected');

        // Reset buy button to show connect mode
        buttonText.textContent = 'Connect Wallet';
        walletIcon.textContent = '👛';
        buyButton.classList.remove('connected');
    }
}

// Presale Widget Functionality
let selectedCurrency = 'SOL';

const exchangeRates = {
    SOL: 10000,
    USDT: 50,
    USDC: 50
};

const currencyButtons = document.querySelectorAll('.currency-btn');
currencyButtons.forEach(btn => {
    btn.addEventListener('click', function () {
        currencyButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedCurrency = this.dataset.currency;
        document.getElementById('payCurrency').textContent = selectedCurrency;
        calculateTokens();
    });
});

const payAmountInput = document.getElementById('payAmount');
payAmountInput.addEventListener('input', calculateTokens);

function calculateTokens() {
    const payAmount = parseFloat(payAmountInput.value) || 0;
    const rate = exchangeRates[selectedCurrency];
    const tokens = payAmount * rate;

    document.getElementById('tokensReceived').value = tokens.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Transfer SOL
async function transferSOL(amount, tokens) {
    try {
        showLoading();

        // Create connection using Phantom's connection
        const connection = new solanaWeb3.Connection(
            'https://solana-mainnet.g.alchemy.com/v2/demo',
            'confirmed'
        );

        // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
        const lamports = parseFloat(amount) * solanaWeb3.LAMPORTS_PER_SOL;

        // Create transaction
        const transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: provider.publicKey,
                toPubkey: new solanaWeb3.PublicKey(PRESALE_ADDRESS),
                lamports: lamports,
            })
        );

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = provider.publicKey;

        // Sign and send transaction using Phantom
        const { signature } = await provider.signAndSendTransaction(transaction);

        closeLoading();
        showSuccess(tokens, signature);

        console.log('Transaction successful:', signature);
    } catch (err) {
        closeLoading();
        console.error('Transaction error:', err);
        showError(err.message || 'Transaction failed. Please try again.');
    }
}

// Transfer SPL Token (USDT/USDC)
async function transferToken(tokenType, amount, tokens) {
    try {
        showLoading();

        const connection = new solanaWeb3.Connection(
            'https://solana-mainnet.g.alchemy.com/v2/demo',
            'confirmed'
        );

        const mintAddress = new solanaWeb3.PublicKey(TOKEN_ADDRESSES[tokenType]);
        const decimals = 6; // USDT and USDC use 6 decimals
        const tokenAmount = Math.floor(parseFloat(amount) * Math.pow(10, decimals));

        // Get user's token account
        const fromTokenAccounts = await connection.getParsedTokenAccountsByOwner(
            provider.publicKey,
            { mint: mintAddress }
        );

        if (fromTokenAccounts.value.length === 0) {
            throw new Error(`You don't have any ${tokenType} in your wallet`);
        }

        const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const ASSOCIATED_TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        const presalePublicKey = new solanaWeb3.PublicKey(PRESALE_ADDRESS);

        // Derive associated token address for destination
        const [associatedTokenAddress] = await solanaWeb3.PublicKey.findProgramAddress(
            [
                presalePublicKey.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                mintAddress.toBuffer(),
            ],
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Check if associated token account exists
        const accountInfo = await connection.getAccountInfo(associatedTokenAddress);

        const transaction = new solanaWeb3.Transaction();

        // If account doesn't exist, create it first
        if (!accountInfo) {
            const createATAInstruction = new solanaWeb3.TransactionInstruction({
                keys: [
                    { pubkey: provider.publicKey, isSigner: true, isWritable: true },
                    { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
                    { pubkey: presalePublicKey, isSigner: false, isWritable: false },
                    { pubkey: mintAddress, isSigner: false, isWritable: false },
                    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                ],
                programId: ASSOCIATED_TOKEN_PROGRAM_ID,
                data: Uint8Array.from([])
            });
            transaction.add(createATAInstruction);
        }

        // Create transfer instruction
        const data = new Uint8Array(9);
        data[0] = 3; // Transfer instruction
        const amountBytes = new BigInt64Array([BigInt(tokenAmount)]);
        data.set(new Uint8Array(amountBytes.buffer), 1);

        const transferInstruction = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: fromTokenAccounts.value[0].pubkey, isSigner: false, isWritable: true },
                { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
                { pubkey: provider.publicKey, isSigner: true, isWritable: false },
            ],
            programId: TOKEN_PROGRAM_ID,
            data
        });

        transaction.add(transferInstruction);

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = provider.publicKey;

        const { signature } = await provider.signAndSendTransaction(transaction);

        closeLoading();
        showSuccess(tokens, signature);

        console.log('Transaction successful:', signature);
    } catch (err) {
        closeLoading();
        console.error('Token transfer error:', err);
        showError(err.message || 'Token transfer failed. Please try again.');
    }
}

// Modal Functions
function showLoading() {
    document.getElementById('loadingModal').style.display = 'flex';
}

function closeLoading() {
    document.getElementById('loadingModal').style.display = 'none';
}

function showSuccess(tokens, signature) {
    const modal = document.getElementById('successModal');
    const message = document.getElementById('successMessage');
    const txLink = document.getElementById('txLink');

    message.textContent = `You will receive ${tokens} LYNX tokens after presale ends!`;
    txLink.href = `https://solscan.io/tx/${signature}`;

    modal.style.display = 'flex';
}

function showError(message) {
    const modal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');

    errorMessage.textContent = message;
    modal.style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Make closeModal globally accessible
window.closeModal = closeModal;

// Close modals when clicking outside
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// ============================================
// COUNTDOWN TIMER - EDIT THE DATE BELOW
// ============================================
// Set your presale end date to 15 days from now
const endDate = new Date();
endDate.setDate(endDate.getDate() + 15);
endDate.setHours(23, 59, 59, 999);

// ============================================

function updateCountdown() {
    const now = new Date().getTime();
    const distance = endDate - now;

    if (distance < 0) {
        document.querySelector('.countdown').innerHTML = '<div style="font-size: 20px; color: #F4B942;">Presale Ended!</div>';
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

setInterval(updateCountdown, 1000);
updateCountdown();


// Slider Functionality
function initSlider(sliderId, prevBtnId, nextBtnId, dotsId) {
    const slider = document.getElementById(sliderId);
    const prevBtn = document.getElementById(prevBtnId);
    const nextBtn = document.getElementById(nextBtnId);
    const dotsContainer = document.getElementById(dotsId);
    const slides = slider.querySelectorAll('.slide');
    let currentSlide = 0;

    // Create dots
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'slider-dot' + (index === 0 ? ' active' : '');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });

    const dots = dotsContainer.querySelectorAll('.slider-dot');

    function updateSlider() {
        slider.style.transform = `translateX(-${currentSlide * 100}%)`;
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
        prevBtn.disabled = currentSlide === 0;
        nextBtn.disabled = currentSlide === slides.length - 1;
    }

    function goToSlide(index) {
        currentSlide = index;
        updateSlider();
    }

    prevBtn.addEventListener('click', () => {
        if (currentSlide > 0) {
            currentSlide--;
            updateSlider();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentSlide < slides.length - 1) {
            currentSlide++;
            updateSlider();
        }
    });

    updateSlider();
}

// Initialize both sliders
initSlider('roadmapSlider', 'roadmapPrev', 'roadmapNext', 'roadmapDots');
initSlider('howtoSlider', 'howtoPrev', 'howtoNext', 'howtoDots');

// Initialize wallet state
updateWalletButton();

// FAQ Accordion
document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const faqItem = question.parentElement;
        const isActive = faqItem.classList.contains('active');

        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('active');
        });

        if (!isActive) {
            faqItem.classList.add('active');
        }
    });
});
// Enhanced mobile menu close functionality
// Close menu when clicking outside (for full-screen overlay)
document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('active') &&
        !navLinks.contains(e.target) &&
        !mobileMenuBtn.contains(e.target)) {
        navLinks.classList.remove('active');
        mobileMenuBtn.classList.remove('menu-open');
    }
});

// Close menu with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        mobileMenuBtn.classList.remove('menu-open');
    }
});
// ============================================
// PROGRESS TRACKING FUNCTIONALITY
// ============================================

// Get Solana RPC connection with fallback
function getSolanaConnection() {
    const endpoint = SOLANA_RPC_ENDPOINTS[currentRPCIndex];
    return new solanaWeb3.Connection(endpoint, 'confirmed');
}

// Fallback to next RPC endpoint if current one fails
function fallbackToNextRPC() {
    currentRPCIndex = (currentRPCIndex + 1) % SOLANA_RPC_ENDPOINTS.length;
    console.log(`Switching to RPC endpoint: ${SOLANA_RPC_ENDPOINTS[currentRPCIndex]}`);
}

// Fetch SOL price from CoinGecko
async function fetchSOLPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        return data.solana.usd;
    } catch (error) {
        console.error('Error fetching SOL price:', error);
        return progressData.solPrice || 100; // Fallback price
    }
}

// Get wallet balance and transaction history
async function fetchWalletData() {
    let connection = getSolanaConnection();
    let retries = 0;
    const maxRetries = SOLANA_RPC_ENDPOINTS.length;

    while (retries < maxRetries) {
        try {
            // Get wallet public key
            const walletPubkey = new solanaWeb3.PublicKey(PRESALE_ADDRESS);
            
            // Get current balance
            const balance = await connection.getBalance(walletPubkey);
            const balanceSOL = balance / solanaWeb3.LAMPORTS_PER_SOL;

            // Get recent transactions to count contributors
            const signatures = await connection.getSignaturesForAddress(
                walletPubkey,
                { limit: 1000 }
            );

            // Filter incoming transactions (where wallet received funds)
            let totalReceived = 0;
            let uniqueContributors = new Set();
            let contributorCount = 0;

            // Process transactions in batches to avoid rate limits
            const batchSize = 50;
            for (let i = 0; i < Math.min(signatures.length, 500); i += batchSize) {
                const batch = signatures.slice(i, i + batchSize);
                
                try {
                    const transactions = await connection.getParsedTransactions(
                        batch.map(sig => sig.signature),
                        { maxSupportedTransactionVersion: 0 }
                    );

                    transactions.forEach((tx, idx) => {
                        if (!tx || !tx.meta || tx.meta.err) return;

                        const signature = batch[idx];
                        const blockTime = signature.blockTime;
                        
                        // Only count transactions after presale start
                        if (blockTime && blockTime < PRESALE_CONFIG.startDate.getTime() / 1000) return;

                        // Check for SOL transfers to our wallet
                        const preBalances = tx.meta.preBalances;
                        const postBalances = tx.meta.postBalances;
                        const accountKeys = tx.transaction.message.accountKeys;

                        // Find our wallet index in account keys
                        const walletIndex = accountKeys.findIndex(key => 
                            key.pubkey.toString() === PRESALE_ADDRESS
                        );

                        if (walletIndex !== -1) {
                            const balanceChange = postBalances[walletIndex] - preBalances[walletIndex];
                            if (balanceChange > 0) {
                                const amountSOL = balanceChange / solanaWeb3.LAMPORTS_PER_SOL;
                                totalReceived += amountSOL;

                                // Track unique contributors
                                const from = tx.transaction.message.accountKeys.find((key, i) => 
                                    i !== walletIndex && (postBalances[i] < preBalances[i])
                                );
                                if (from) {
                                    uniqueContributors.add(from.pubkey.toString());
                                }
                            }
                        }
                    });
                } catch (batchError) {
                    console.warn('Error processing transaction batch:', batchError);
                }

                // Add delay between batches to respect rate limits
                if (i + batchSize < signatures.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            contributorCount = uniqueContributors.size;

            return {
                balance: balanceSOL,
                totalReceived: totalReceived,
                contributorCount: contributorCount,
                success: true
            };

        } catch (error) {
            console.error(`RPC error with ${SOLANA_RPC_ENDPOINTS[currentRPCIndex]}:`, error);
            retries++;
            
            if (retries < maxRetries) {
                fallbackToNextRPC();
                connection = getSolanaConnection();
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
        }
    }

    // If all RPCs fail, return cached data or estimates
    console.error('All RPC endpoints failed, using cached/estimated data');
    return {
        balance: progressData.totalRaised,
        totalReceived: progressData.totalRaised,
        contributorCount: progressData.contributorCount,
        success: false
    };
}

// Update progress display
function updateProgressDisplay(data) {
    const { totalRaised, totalRaisedUSD, contributorCount, percentage } = data;

    // Update progress bar
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill && progressText) {
        progressFill.style.width = `${Math.min(percentage, 100)}%`;
        progressText.textContent = `${percentage.toFixed(1)}%`;
    }

    // Update stats
    const elements = {
        'raisedAmount': totalRaised.toFixed(2),
        'targetAmount': PRESALE_CONFIG.targetAmount,
        'totalRaisedUSD': `$${totalRaisedUSD.toLocaleString()}`,
        'contributorCount': contributorCount
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });

    // Update timestamp
    progressData.lastUpdate = new Date();
    console.log('Progress updated:', data);
}

// Main progress tracking function
async function updatePresaleProgress() {
    const progressContainer = document.querySelector('.progress-container');
    
    try {
        // Add loading state
        if (progressContainer) {
            progressContainer.classList.add('progress-loading');
        }

        // Fetch SOL price if needed
        if (!progressData.solPrice || Date.now() - (progressData.lastPriceUpdate || 0) > PRESALE_CONFIG.solPriceUpdateInterval) {
            progressData.solPrice = await fetchSOLPrice();
            progressData.lastPriceUpdate = Date.now();
        }

        // Fetch wallet data
        const walletData = await fetchWalletData();
        
        if (walletData.success) {
            // Use the more accurate totalReceived for presale tracking
            progressData.totalRaised = walletData.totalReceived;
            progressData.contributorCount = walletData.contributorCount;
        } else {
            // Use balance as fallback if transaction history fails
            progressData.totalRaised = Math.max(progressData.totalRaised, walletData.balance);
        }

        // Calculate USD value and percentage
        progressData.totalRaisedUSD = progressData.totalRaised * progressData.solPrice;
        progressData.percentage = (progressData.totalRaised / PRESALE_CONFIG.targetAmount) * 100;

        // Update display
        updateProgressDisplay(progressData);

    } catch (error) {
        console.error('Error updating presale progress:', error);
    } finally {
        // Remove loading state
        if (progressContainer) {
            progressContainer.classList.remove('progress-loading');
        }
    }
}

// Copy wallet address functionality
function initializeWalletCopy() {
    const copyBtn = document.getElementById('copyWalletBtn');
    const walletAddress = document.getElementById('displayWalletAddress');
    
    if (copyBtn && walletAddress) {
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(walletAddress.textContent);
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✅';
                copyBtn.style.color = '#4CAF50';
                
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.color = '#F4B942';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy wallet address:', err);
                // Fallback for browsers that don't support clipboard API
                const textArea = document.createElement('textarea');
                textArea.value = walletAddress.textContent;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                copyBtn.textContent = '✅';
                setTimeout(() => copyBtn.textContent = '📋', 2000);
            }
        });
    }
}

// Initialize progress tracking
function initializeProgressTracking() {
    // Set initial target amount display
    const targetElement = document.getElementById('targetAmount');
    if (targetElement) {
        targetElement.textContent = PRESALE_CONFIG.targetAmount;
    }

    // Initialize wallet copy functionality
    initializeWalletCopy();

    // Update progress immediately
    updatePresaleProgress();

    // Set up periodic updates
    setInterval(updatePresaleProgress, PRESALE_CONFIG.refreshInterval);

    console.log('Progress tracking initialized');
}

// Start progress tracking when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for other scripts to load
    setTimeout(initializeProgressTracking, 1000);
});

// Also initialize if the script loads after DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeProgressTracking);
} else {
    setTimeout(initializeProgressTracking, 1000);
}