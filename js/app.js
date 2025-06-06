// ============= APP.JS - Logique principale de l'application =============
// Interface utilisateur et orchestration des fonctionnalités

class CrypturaApp {
    constructor() {
        this.version = '2.0.0';
        this.appName = 'Cryptura';
        this.currentTab = 'encode';
        this.currentTheme = localStorage.getItem('cryptura_theme') || 'dark';
        this.i18n = window.i18n || null;
        this.steganographyEngine = new SteganographyEngine();
        this.ultraCrypte = new UltraCrypte();
        this.filesProcessed = 0;
        this.adminActivated = false;
        
        // Correction: Référence correcte à l'engine de stéganographie
        this.steganography = this.steganographyEngine;
        
        // Initialisation des fichiers
        this.currentFiles = {
            carrier: null,
            secret: null,
            decode: null,
            ultra: null
        };
        
        // Plugin manager basique
        this.pluginManager = {
            methods: {},
            registerSteganographyMethod: (name, implementation) => {
                this.pluginManager.methods[name] = implementation;
            }
        };
        
        this.init();
        this.initScrollEffects();
    }

    // ========== INITIALISATION ==========

    init() {
        this.setupWebWorkers();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupKeyboardShortcuts();
        this.setupLanguageSystem();
        this.setupThemeSystem();
        this.setupNotificationSystem();
        this.setupPluginSystem();
        this.setupAdminAccess();
        this.setupLogoAnimations();
        this.initScrollEffects(); // CORRECTION: Méthode maintenant présente
        this.updateStats();

        // Affichage du panneau initial
        this.showPanel('encode');

        // Suppression de la ligne qui causait l'erreur
        // this.i18n.updateInterface();

        // Message de bienvenue
        this.showMessage(this.i18n ? this.i18n.translate('message.welcome') || 'Bienvenue dans Cryptura!' : 'Bienvenue dans Cryptura!', 'success');
    }

    setupWebWorkers() {
        // Initialisation du worker crypto si supporté
        if (typeof Worker !== 'undefined') {
            try {
                // Création du worker crypto inline
                const workerCode = `
                    // Code simplifié du crypto worker
                    self.onmessage = async function(e) {
                        const { taskId, operation, data } = e.data;
                        
                        try {
                            let result;
                            
                            if (operation === 'hash') {
                                const hash = await crypto.subtle.digest('SHA-256', data.data);
                                result = { hash: Array.from(new Uint8Array(hash)) };
                            } else if (operation === 'encrypt') {
                                // Chiffrement simple pour le worker
                                const key = await crypto.subtle.importKey(
                                    'raw',
                                    new TextEncoder().encode(data.password.padEnd(32, '0').slice(0, 32)),
                                    'AES-GCM',
                                    false,
                                    ['encrypt']
                                );
                                
                                const iv = crypto.getRandomValues(new Uint8Array(12));
                                const encrypted = await crypto.subtle.encrypt(
                                    { name: 'AES-GCM', iv: iv },
                                    key,
                                    data.data
                                );
                                
                                const combined = new Uint8Array(iv.length + encrypted.byteLength);
                                combined.set(iv);
                                combined.set(new Uint8Array(encrypted), iv.length);
                                
                                result = { data: combined };
                            }
                            
                            self.postMessage({ taskId, success: true, result });
                        } catch (error) {
                            self.postMessage({ taskId, success: false, error: error.message });
                        }
                    };
                `;

                const blob = new Blob([workerCode], { type: 'application/javascript' });
                this.cryptoWorker = new Worker(URL.createObjectURL(blob));

                this.cryptoWorker.onmessage = (e) => {
                    this.handleWorkerMessage(e.data);
                };

            } catch (error) {
                console.warn('⚠️ Web Workers non supportés:', error);
            }
        }
    }

    handleWorkerMessage(data) {
        const { taskId, success, result, error, progress } = data;

        if (progress !== undefined) {
            // Mise à jour du progrès si applicable
            return;
        }

        if (success) {
            // Traitement du résultat selon le type de tâche
        } else {
            console.error(`❌ Worker task ${taskId} failed:`, error);
        }
    }

    async useWorkerForCrypto(operation, data) {
        if (!this.cryptoWorker) {
            throw new Error('Worker crypto non disponible');
        }

        return new Promise((resolve, reject) => {
            const taskId = Date.now() + Math.random();

            const timeout = setTimeout(() => {
                reject(new Error('Timeout worker'));
            }, 30000);

            const messageHandler = (e) => {
                const response = e.data;
                if (response.taskId === taskId) {
                    clearTimeout(timeout);
                    this.cryptoWorker.removeEventListener('message', messageHandler);

                    if (response.success) {
                        resolve(response.result);
                    } else {
                        reject(new Error(response.error));
                    }
                }
            };

            this.cryptoWorker.addEventListener('message', messageHandler);
            this.cryptoWorker.postMessage({ taskId, operation, data });
        });
    }

        // Dans app.js - Méthode à ajouter
    async handleLargeFileEncryption(data, password) {
        if (data.length > 1024 * 1024) { // > 1MB
            try {
                const result = await this.useWorkerForCrypto('encrypt', {
                    data: data,
                    password: password,
                    algorithm: 'aes-gcm'
                });
                return result;
            } catch (error) {
                // Fallback vers méthode synchrone
                return await this.basicEncrypt(data, password);
            }
        }
        return await this.basicEncrypt(data, password);
    }

    setupPluginSystem() {
        // Enregistrement des plugins de base
        try {
            // Plugin d'exemple de stéganographie
            this.pluginManager.registerSteganographyMethod('example', {
                displayName: 'Exemple Plugin',
                hide: async (carrierFile, secretData) => {
                    // Implémentation basique
                    const carrierData = await this.fileToArrayBuffer(carrierFile);
                    const combined = new Uint8Array(carrierData.byteLength + secretData.length + 16);
                    combined.set(new Uint8Array(carrierData));
                    combined.set(new TextEncoder().encode('PLUGIN_START'), carrierData.byteLength);
                    combined.set(secretData, carrierData.byteLength + 12);
                    combined.set(new TextEncoder().encode('END'), carrierData.byteLength + secretData.length + 12);

                    return new Blob([combined], { type: carrierFile.type });
                },
                extract: async (carrierFile) => {
                    const data = await this.fileToArrayBuffer(carrierFile);
                    const uint8Data = new Uint8Array(data);
                    const marker = new TextEncoder().encode('PLUGIN_START');

                    for (let i = 0; i <= uint8Data.length - marker.length; i++) {
                        if (this.arrayEqual(uint8Data.slice(i, i + marker.length), marker)) {
                            const endMarker = new TextEncoder().encode('END');
                            for (let j = i + marker.length; j <= uint8Data.length - endMarker.length; j++) {
                                if (this.arrayEqual(uint8Data.slice(j, j + endMarker.length), endMarker)) {
                                    return uint8Data.slice(i + marker.length, j);
                                }
                            }
                        }
                    }
                    throw new Error('Données plugin non trouvées');
                }
            });

        } catch (error) {
            console.error('❌ Erreur chargement plugins:', error);
        }
    }

    setupLanguageSystem() {
        // Initialisation simplifiée du système de langue
        if (this.i18n) {
            this.i18n.applyLanguage(this.i18n.getCurrentLanguage());
        }
    }

    setupThemeSystem() {
        // Application du thème initial
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        // Mise à jour de l'icône du bouton
        this.updateThemeToggle();
        
        // Event listener pour le toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    setTheme(theme) {
        if (theme === 'dark' || theme === 'light') {
            this.currentTheme = theme;
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('cryptura_theme', theme);
            this.updateThemeToggle();
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    updateThemeToggle() {
        const toggle = document.getElementById('theme-toggle');
        const icon = toggle?.querySelector('i');
        const text = toggle?.querySelector('.toggle-text');
        
        if (icon && text) {
            if (this.currentTheme === 'dark') {
                icon.className = 'fas fa-sun';
                text.textContent = this.i18n ? this.i18n.translate('theme.light') : 'Light';
            } else {
                icon.className = 'fas fa-moon';
                text.textContent = this.i18n ? this.i18n.translate('theme.dark') : 'Dark';
            }
        }
    }

    setupAdminAccess() {
        this.logoClicks = 0;

        const logo = document.querySelector('.logo-container');
        if (logo) {
            logo.addEventListener('click', (e) => {
                this.logoClicks++;
                
                if (this.logoClicks === 3) {
                    this.promptForAdminCode();
                    this.logoClicks = 0;
                }
                
                // Reset après 2 secondes
                setTimeout(() => {
                    if (this.logoClicks < 3) this.logoClicks = 0;
                }, 2000);
            });
        }
    }

    promptForAdminCode() {
        // Effet visuel pour indiquer l'activation
        this.showAdminPromptHint();
        
        setTimeout(() => {
            const code = prompt('🔑 Code d\'accès administrateur Cryptura:');
            
            if (code === 'CRYPTURA') {
                this.activateAdminMode();
            } else if (code !== null) { // Si pas annulé
                this.showMessage('Code d\'accès incorrect', 'error');
            }
        }, 500);
    }

    showAdminPromptHint() {
        const hint = document.createElement('div');
        hint.className = 'admin-hint';
        hint.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(30, 41, 59, 0.95));
            color: #00ff00;
            padding: 2rem 3rem;
            border-radius: 15px;
            font-family: 'Courier New', monospace;
            font-size: 1.2rem;
            z-index: 9999;
            animation: adminPulse 1s ease-in-out 3;
            border: 2px solid #00ff00;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.5), inset 0 0 20px rgba(0, 255, 0, 0.1);
            text-align: center;
        `;
        hint.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <i class="fas fa-shield-alt" style="font-size: 2rem; animation: spin 2s linear infinite;"></i>
            </div>
            <div>CRYPTURA ACCESS REQUESTED...</div>
            <div style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.7;">ADMIN MODE STANDBY</div>
        `;
        document.body.appendChild(hint);
        
        setTimeout(() => {
            if (hint.parentNode) hint.parentNode.removeChild(hint);
        }, 2000);
    }

    activateAdminMode() {
        // Effet visuel amélioré
        this.showAdminActivationEffect();
        
        // Message de confirmation
        this.showMessage('🔓 Mode administrateur Cryptura activé!', 'success');
        
        // Charger le script admin si pas déjà fait
        setTimeout(() => {
            if (!window.adminMode) {
                const script = document.createElement('script');
                script.src = 'js/admin.js';
                script.onload = () => {
                    // Attendre que l'AdminPanel soit complètement initialisé
                    let attempts = 0;
                    const checkAdmin = () => {
                        attempts++;
                        if (window.adminMode && typeof window.adminMode.toggleVisibility === 'function') {
                            window.adminMode.toggleVisibility();
                        } else if (attempts < 10) {
                            setTimeout(checkAdmin, 200);
                        } else {
                            this.showMessage('Erreur d\'initialisation du mode admin', 'error');
                        }
                    };
                    
                    setTimeout(checkAdmin, 100);
                };
                script.onerror = (error) => {
                    this.showMessage('Erreur de chargement du mode admin', 'error');
                };
                document.head.appendChild(script);
            } else {
                if (typeof window.adminMode.toggleVisibility === 'function') {
                    window.adminMode.toggleVisibility();
                } else {
                    this.showMessage('Panel admin défaillant', 'error');
                }
            }
        }, 500);
    }

    showAdminActivationEffect() {
        const effect = document.createElement('div');
        effect.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(45deg, 
                rgba(59, 130, 246, 0.3), 
                rgba(16, 185, 129, 0.3), 
                rgba(139, 92, 246, 0.3),
                rgba(59, 130, 246, 0.3)
            );
            background-size: 400% 400%;
            opacity: 0;
            z-index: 10000;
            pointer-events: none;
            animation: crypturaActivation 2s ease-out;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes crypturaActivation {
                0% { 
                    opacity: 0; 
                    transform: scale(0);
                    background-position: 0% 50%;
                }
                25% { 
                    opacity: 0.8; 
                    transform: scale(1.1);
                    background-position: 100% 50%;
                }
                50% {
                    opacity: 1;
                    background-position: 0% 100%;
                }
                75% {
                    opacity: 0.6;
                    background-position: 100% 0%;
                }
                100% { 
                    opacity: 0; 
                    transform: scale(1);
                    background-position: 50% 50%;
                }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) effect.parentNode.removeChild(effect);
            if (style.parentNode) style.parentNode.removeChild(style);
        }, 2000);
    }

    setupNotificationSystem() {
        // Création de la zone de notification si elle n'existe pas
        if (!document.getElementById('notification-zone')) {
            const notificationZone = document.createElement('div');
            notificationZone.className = 'notification-zone';
            notificationZone.id = 'notification-zone';
            document.body.appendChild(notificationZone);
        }
    }

    
    setupEventListeners() {
        // Navigation principale avec animations améliorées
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                
                // Animation de click
                this.animateTabClick(e.currentTarget);
                
                // Changement d'onglet avec délai pour l'animation
                setTimeout(() => {
                    this.switchTab(targetTab);
                }, 150);
            });
            
            // Effets au survol améliorés
            tab.addEventListener('mouseenter', (e) => {
                this.animateTabHover(e.currentTarget, true);
            });
            
            tab.addEventListener('mouseleave', (e) => {
                this.animateTabHover(e.currentTarget, false);
            });
        });

        // Upload zones
        document.getElementById('carrier-upload').addEventListener('click', () => {
            document.getElementById('carrier-file').click();
        });
        
        document.getElementById('decode-upload').addEventListener('click', () => {
            document.getElementById('decode-file').click();
        });

        // Navigation entre panneaux
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Boutons d'upload de fichiers - CORRECTION
        const carrierUpload = document.getElementById('carrier-upload');
        const secretUpload = document.getElementById('secret-upload');
        const decodeUpload = document.getElementById('decode-upload');
        const ultraUpload = document.getElementById('ultra-file-upload');

        // CORRECTION: Empêcher le double déclenchement avec une variable de contrôle
        let fileInputBusy = false;

        if (carrierUpload) {
            carrierUpload.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (fileInputBusy) return;
                fileInputBusy = true;
                
                const fileInput = document.getElementById('carrier-file');
                if (fileInput) {
                    fileInput.click();
                }
                
                // Reset du flag après un délai
                setTimeout(() => { fileInputBusy = false; }, 500);
            });
        }

        if (secretUpload) {
            secretUpload.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (fileInputBusy) return;
                fileInputBusy = true;
                
                // Vérifier si c'est le textarea ou la zone d'upload
                if (e.target.tagName === 'TEXTAREA') {
                    fileInputBusy = false;
                    return; // Laisser le textarea fonctionner normalement
                }
                
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.style.display = 'none';
                fileInput.addEventListener('change', (evt) => {
                    if (evt.target.files && evt.target.files.length > 0) {
                        this.handleFileDrop(evt.target.files[0], 'secret');
                    }
                    document.body.removeChild(fileInput);
                });
                
                document.body.appendChild(fileInput);
                fileInput.click();
                
                setTimeout(() => { fileInputBusy = false; }, 500);
            });
        }

        if (decodeUpload) {
            decodeUpload.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (fileInputBusy) return;
                fileInputBusy = true;
                
                const fileInput = document.getElementById('decode-file');
                if (fileInput) {
                    fileInput.click();
                }
                
                setTimeout(() => { fileInputBusy = false; }, 500);
            });
        }

        if (ultraUpload) {
            ultraUpload.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (fileInputBusy) return;
                fileInputBusy = true;
                
                const fileInput = document.getElementById('ultra-file');
                if (fileInput) {
                    fileInput.click();
                }
                
                setTimeout(() => { fileInputBusy = false; }, 500);
            });
        }

        // Boutons d'action principaux
        const encodeBtn = document.getElementById('encode-btn');
        const decodeBtn = document.getElementById('decode-btn');
        const analyzeBtn = document.getElementById('analyze-btn');
        const resetBtn = document.getElementById('reset-encode');
        const ultraEncryptBtn = document.getElementById('ultra-encrypt');
        const ultraDecryptBtn = document.getElementById('ultra-decrypt');

        if (encodeBtn) {
            encodeBtn.addEventListener('click', () => {
                this.handleEncode();
            });
        }

        if (decodeBtn) {
            decodeBtn.addEventListener('click', () => {
                this.handleDecode();
            });
        }

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                this.handleAnalyze();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetEncode();
            });
        }

        if (ultraEncryptBtn) {
            ultraEncryptBtn.addEventListener('click', () => {
                this.handleUltraEncrypt();
            });
        }

        if (ultraDecryptBtn) {
            ultraDecryptBtn.addEventListener('click', () => {
                this.handleUltraDecrypt();
            });
        }

        // Toggle visibilité des mots de passe
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.togglePasswordVisibility(e);
            });
        });

        // Vérification force mot de passe UltraCrypte
        const ultraKeyInput = document.getElementById('ultra-master-key');
        if (ultraKeyInput) {
            ultraKeyInput.addEventListener('input', (e) => {
                this.checkPasswordStrength(e.target.value);
            });
        }

        // CORRECTION: Event listeners pour les changements de fichiers - SANS DOUBLE DÉCLENCHEMENT
        const carrierFileInput = document.getElementById('carrier-file');
        const decodeFileInput = document.getElementById('decode-file');
        const ultraFileInput = document.getElementById('ultra-file');

        if (carrierFileInput) {
            carrierFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    this.handleFileDrop(e.target.files[0], 'carrier');
                }
            });
        }

        if (decodeFileInput) {
            decodeFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    this.handleFileDrop(e.target.files[0], 'decode');
                }
            });
        }

        if (ultraFileInput) {
            ultraFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    this.handleFileDrop(e.target.files[0], 'ultra');
                }
            });
        }

        // Surveillance des changements de méthode de stéganographie
        document.getElementById('stego-method').addEventListener('change', (e) => {
            this.updateMethodInfo(e.target.value);
        });

        // Surveillance du niveau de chiffrement
        document.getElementById('crypto-level').addEventListener('change', (e) => {
            this.updateCryptoInfo(e.target.value);
        });

        // Surveillance des options avancées
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateOptionsInfo();
            });
        });
    }

    // Nouvelle méthode pour animer le click sur les onglets
    animateTabClick(tab) {
        const icon = tab.querySelector('.tab-icon');
        const content = tab.querySelector('.tab-content');
        
        if (icon && content) {
            // Animation de rebond
            icon.style.transform = 'scale(0.9)';
            content.style.transform = 'translateY(2px)';
            
            setTimeout(() => {
                icon.style.transform = '';
                content.style.transform = '';
            }, 150);
        }
        
        // Effet de vague
        this.createRippleEffect(tab);
    }

    // Nouvelle méthode pour les effets de survol
    animateTabHover(tab, isEntering) {
        const icon = tab.querySelector('.tab-icon');
        const subtitle = tab.querySelector('.tab-subtitle');
        
        if (isEntering) {
            if (icon) {
                icon.style.transform = 'scale(1.05) rotate(5deg)';
            }
            if (subtitle) {
                subtitle.style.transform = 'translateY(-1px)';
                subtitle.style.opacity = '1';
            }
        } else {
            if (icon) {
                icon.style.transform = '';
            }
            if (subtitle) {
                subtitle.style.transform = '';
                if (!tab.classList.contains('active')) {
                    subtitle.style.opacity = '';
                }
            }
        }
    }

    // Effet de vague (ripple) au click
    createRippleEffect(element) {
        const ripple = document.createElement('div');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        ripple.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: ${size}px;
            height: ${size}px;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
            border-radius: 50%;
            transform: translate(-50%, -50%) scale(0);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
            z-index: 1;
        `;
        
        // Ajouter l'animation CSS
        if (!document.querySelector('#ripple-animation')) {
            const style = document.createElement('style');
            style.id = 'ripple-animation';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: translate(-50%, -50%) scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        element.style.position = 'relative';
        element.appendChild(ripple);
        
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    // Amélioration de la méthode switchTab
    switchTab(tabName) {
        // Mise à jour des onglets avec animation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            
            // Animation de sortie pour l'onglet précédent
            if (tab.classList.contains('active') && !isActive) {
                this.animateTabDeactivation(tab);
            }
            
            tab.classList.toggle('active', isActive);
            
            // Animation d'entrée pour le nouvel onglet
            if (isActive) {
                this.animateTabActivation(tab);
            }
        });

        // Animation des panneaux
        this.animatePanelTransition(tabName);
        
        this.currentTab = tabName;
        this.onPanelChange(tabName);
    }

    // Animation d'activation d'onglet
    animateTabActivation(tab) {
        const icon = tab.querySelector('.tab-icon');
        const indicator = tab.querySelector('.tab-indicator');
        
        if (icon) {
            icon.style.transform = 'scale(1.2)';
            setTimeout(() => {
                icon.style.transform = 'scale(1.1)';
            }, 200);
        }
        
        if (indicator) {
            indicator.style.width = '0';
            setTimeout(() => {
                indicator.style.width = 'calc(100% - 2rem)';
            }, 100);
        }
        
        // Effet de glow
        this.createGlowEffect(tab);
    }

    // Animation de désactivation d'onglet
    animateTabDeactivation(tab) {
        const icon = tab.querySelector('.tab-icon');
        const indicator = tab.querySelector('.tab-indicator');
        
        if (icon) {
            icon.style.transform = 'scale(0.95)';
            setTimeout(() => {
                icon.style.transform = '';
            }, 200);
        }
        
        if (indicator) {
            indicator.style.width = '0';
        }
    }

    // Effet de glow pour l'onglet actif
    createGlowEffect(tab) {
        const glow = document.createElement('div');
        glow.style.cssText = `
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(135deg, 
                rgba(59, 130, 246, 0.2) 0%, 
                rgba(99, 102, 241, 0.2) 50%, 
                rgba(139, 92, 246, 0.2) 100%);
            border-radius: 18px;
            opacity: 0;
            animation: glowPulse 2s ease-in-out;
            pointer-events: none;
            z-index: 0;
        `;
        
        // Ajouter l'animation CSS si elle n'existe pas
        if (!document.querySelector('#glow-animation')) {
            const style = document.createElement('style');
            style.id = 'glow-animation';
            style.textContent = `
                @keyframes glowPulse {
                    0% { opacity: 0; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.05); }
                    100% { opacity: 0; transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        tab.style.position = 'relative';
        tab.insertBefore(glow, tab.firstChild);
        
        setTimeout(() => {
            if (glow.parentNode) {
                glow.parentNode.removeChild(glow);
            }
        }, 2000);
    }

    // Animation de transition des panneaux
    animatePanelTransition(newPanelName) {
        const currentPanel = document.querySelector('.panel.active');
        const newPanel = document.getElementById(`${newPanelName}-panel`);
        
        if (currentPanel && newPanel && currentPanel !== newPanel) {
            // Animation de sortie
            currentPanel.style.opacity = '0';
            currentPanel.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                currentPanel.classList.remove('active');
                currentPanel.style.opacity = '';
                currentPanel.style.transform = '';
                
                // Animation d'entrée
                newPanel.classList.add('active');
                newPanel.style.opacity = '0';
                newPanel.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    newPanel.style.opacity = '1';
                    newPanel.style.transform = 'translateY(0)';
                }, 50);
            }, 150);
        } else if (newPanel) {
            // Premier affichage
            newPanel.classList.add('active');
        }
    }

    setupDragAndDrop() {
        const dropZones = document.querySelectorAll('.upload-zone');

        dropZones.forEach(zone => {
            // Prévention du comportement par défaut
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                zone.addEventListener(eventName, this.preventDefaults, false);
            });

            // Highlight visuel lors du drag
            ['dragenter', 'dragover'].forEach(eventName => {
                zone.addEventListener(eventName, () => {
                    zone.classList.add('dragover');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                zone.addEventListener(eventName, () => {
                    zone.classList.remove('dragover');
                }, false);
            });

            // Gestion du drop
            zone.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    const zoneId = zone.id;
                    let type = '';

                    if (zoneId === 'carrier-upload') type = 'carrier';
                    else if (zoneId === 'secret-upload') type = 'secret';
                    else if (zoneId === 'decode-upload') type = 'decode';

                    if (type) {
                    }
                }
            });
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+E : Encodage
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.showPanel('encode');
            }
            // Ctrl+D : Décodage  
            else if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.showPanel('decode');
            }
            // Ctrl+U : UltraCrypte
            else if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                this.showPanel('ultracrypte');
            }
            // Ctrl+H : Aide
            else if (e.ctrlKey && e.key === 'h') {
                e.preventDefault();
                this.showPanel('help');
            }
            // Escape : Reset/Annulation
            else if (e.key === 'Escape') {
                this.cancelOperations();
            }
        });
    }

    setupLogoAnimations() {
        const logoContainer = document.querySelector('.logo-container');
        const logo = document.querySelector('.logo');
        
        if (logoContainer && logo) {
            // Animation spéciale au survol
            logoContainer.addEventListener('mouseenter', () => {
                logo.style.filter = 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.6))';
            });
            
            logoContainer.addEventListener('mouseleave', () => {
                logo.style.filter = 'none';
            });
            
            // Effet de click avec feedback visuel
            logoContainer.addEventListener('mousedown', () => {
                logo.style.transform = 'scale(0.9)';
                logo.style.filter = 'brightness(1.3) drop-shadow(0 0 30px rgba(59, 130, 246, 0.8))';
            });
            
            logoContainer.addEventListener('mouseup', () => {
                logo.style.transform = '';
                logo.style.filter = 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.6))';
            });
        }
    }

    // ========== GESTION DES ONGLETS ==========

    switchTab(tabName) {
        // Mise à jour des onglets avec animation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            
            // Animation de sortie pour l'onglet précédent
            if (tab.classList.contains('active') && !isActive) {
                this.animateTabDeactivation(tab);
            }
            
            tab.classList.toggle('active', isActive);
            
            // Animation d'entrée pour le nouvel onglet
            if (isActive) {
                this.animateTabActivation(tab);
            }
        });

        // Animation des panneaux
        this.animatePanelTransition(tabName);
        
        this.currentTab = tabName;
        this.onPanelChange(tabName);
    }

    // Animation d'activation d'onglet
    animateTabActivation(tab) {
        const icon = tab.querySelector('.tab-icon');
        const indicator = tab.querySelector('.tab-indicator');
        
        if (icon) {
            icon.style.transform = 'scale(1.2)';
            setTimeout(() => {
                icon.style.transform = 'scale(1.1)';
            }, 200);
        }
        
        if (indicator) {
            indicator.style.width = '0';
            setTimeout(() => {
                indicator.style.width = 'calc(100% - 2rem)';
            }, 100);
        }
        
        // Effet de glow
        this.createGlowEffect(tab);
    }

    // Animation de désactivation d'onglet
    animateTabDeactivation(tab) {
        const icon = tab.querySelector('.tab-icon');
        const indicator = tab.querySelector('.tab-indicator');
        
        if (icon) {
            icon.style.transform = 'scale(0.95)';
            setTimeout(() => {
                icon.style.transform = '';
            }, 200);
        }
        
        if (indicator) {
            indicator.style.width = '0';
        }
    }

    // Effet de glow pour l'onglet actif
    createGlowEffect(tab) {
        const glow = document.createElement('div');
        glow.style.cssText = `
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(135deg, 
                rgba(59, 130, 246, 0.2) 0%, 
                rgba(99, 102, 241, 0.2) 50%, 
                rgba(139, 92, 246, 0.2) 100%);
            border-radius: 18px;
            opacity: 0;
            animation: glowPulse 2s ease-in-out;
            pointer-events: none;
            z-index: 0;
        `;
        
        // Ajouter l'animation CSS si elle n'existe pas
        if (!document.querySelector('#glow-animation')) {
            const style = document.createElement('style');
            style.id = 'glow-animation';
            style.textContent = `
                @keyframes glowPulse {
                    0% { opacity: 0; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.05); }
                    100% { opacity: 0; transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        tab.style.position = 'relative';
        tab.insertBefore(glow, tab.firstChild);
        
        setTimeout(() => {
            if (glow.parentNode) {
                glow.parentNode.removeChild(glow);
            }
        }, 2000);
    }

    // Animation de transition des panneaux
    animatePanelTransition(newPanelName) {
        const currentPanel = document.querySelector('.panel.active');
        const newPanel = document.getElementById(`${newPanelName}-panel`);
        
        if (currentPanel && newPanel && currentPanel !== newPanel) {
            // Animation de sortie
            currentPanel.style.opacity = '0';
            currentPanel.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                currentPanel.classList.remove('active');
                currentPanel.style.opacity = '';
                currentPanel.style.transform = '';
                
                // Animation d'entrée
                newPanel.classList.add('active');
                newPanel.style.opacity = '0';
                newPanel.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    newPanel.style.opacity = '1';
                    newPanel.style.transform = 'translateY(0)';
                }, 50);
            }, 150);
        } else if (newPanel) {
            // Premier affichage
            newPanel.classList.add('active');
        }
    }

    // ========== GESTION DES FICHIERS ==========

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleFileSelect(input, type) {
        if (input.files && input.files.length > 0) {
            this.handleFileDrop(input.files[0], type);
        }
    }

    handleFileDrop(file, type) {
        const maxSize = 100 * 1024 * 1024; // 100MB

        // Validation de la taille
        if (file.size > maxSize) {
            this.showMessage(`Fichier trop volumineux: ${this.formatFileSize(file.size)} (max 100MB)`, 'error');
            return;
        }

        // Validation du type selon l'usage
        if (!this.validateFileType(file, type)) {
            return;
        }

        // Stockage et mise à jour de l'interface
        this.currentFiles[type] = file;
        this.updateUploadZone(type + '-upload', file);

        // Actions spécifiques selon le type
        if (type === 'secret') {
            // Effacer le texte secret si un fichier est sélectionné
            const secretTextarea = document.getElementById('secret-text');
            if (secretTextarea) {
                secretTextarea.value = '';
            }
        }

        // Mise à jour des informations contextuelles
        this.updateFileInfo(type, file);
    }

    validateFileType(file, usage) {
        // Méthode simplifiée pour éviter l'erreur
        const extension = file.name.split('.').pop().toLowerCase();
        const supportedExtensions = {
            image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
            audio: ['mp3', 'wav', 'flac', 'ogg', 'm4a'],
            video: ['mp4', 'avi', 'mkv', 'mov', 'wmv'],
            document: ['pdf', 'txt', 'doc', 'docx', 'rtf']
        };

        // Détection du type de fichier basique
        let fileType = 'unknown';
        for (const [type, extensions] of Object.entries(supportedExtensions)) {
            if (extensions.includes(extension)) {
                fileType = type;
                break;
            }
        }

        // Types supportés selon l'usage
        const supportedTypes = {
            carrier: ['image', 'audio', 'video', 'document'],
            secret: ['any'], // Tout type de fichier peut être caché
            decode: ['any'], // Tout fichier peut potentiellement contenir des données
            ultra: ['any'] // UltraCrypte peut chiffrer tout type de fichier
        };

        if (usage === 'carrier' && fileType === 'unknown') {
            this.showMessage(`Type de fichier non supporté pour porteur: .${extension}`, 'warning');
            this.showMessage('Types supportés: Images (jpg, png, gif), Audio (mp3, wav), Vidéo (mp4, avi), Documents (pdf, txt)', 'info');
            return false;
        }

        return true;
    }

    updateUploadZone(zoneId, file) {
        const zone = document.getElementById(zoneId);
        const icon = zone.querySelector('i');
        const title = zone.querySelector('h3');
        const description = zone.querySelector('p');
        const small = zone.querySelector('small');

        // Mise à jour visuelle
        icon.className = 'fas fa-check-circle';
        icon.style.color = 'var(--success-color)';
        title.textContent = file.name;
        description.textContent = `${this.formatFileSize(file.size)}`;

        if (small) {
            const fileType = this.steganography.detectFileType(file);
            small.textContent = `Type: ${fileType} - ${file.type || 'Type MIME inconnu'}`;
        }

        // Stockage des métadonnées
        zone.dataset.file = JSON.stringify({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        });

        // Animation de succès
        zone.classList.add('fade-in');
    }

    updateFileInfo(type, file) {
        // Méthode simplifiée pour éviter les erreurs
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (type === 'carrier') {
            // Estimation basique de capacité selon le type de fichier
            let capacity = 0;
            
            if (['jpg', 'jpeg', 'png', 'bmp'].includes(extension)) {
                capacity = Math.floor(file.size * 0.1); // ~10% pour les images
            } else if (['mp3', 'wav', 'flac'].includes(extension)) {
                capacity = Math.floor(file.size * 0.05); // ~5% pour l'audio
            } else if (['mp4', 'avi', 'mkv'].includes(extension)) {
                capacity = Math.floor(file.size * 0.02); // ~2% pour la vidéo
            } else if (['pdf', 'txt', 'doc'].includes(extension)) {
                capacity = Math.floor(file.size * 0.15); // ~15% pour les documents
            }

            if (capacity > 0) {
                this.showMessage(`💾 Capacité estimée: ${this.formatFileSize(capacity)}`, 'info');
            }
        }
    }

    // ========== NAVIGATION ET INTERFACE ==========

    showPanel(panelName) {
        // Mise à jour des onglets
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const activeTab = document.querySelector(`[data-tab="${panelName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Mise à jour des panneaux
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });

        const activePanel = document.getElementById(`${panelName}-panel`);
        if (activePanel) {
            activePanel.classList.add('active');
        }

        // Actions spécifiques selon le panneau
        this.onPanelChange(panelName);
    }

    onPanelChange(panelName) {
        // Effacement des messages précédents
        this.clearMessages();

        switch (panelName) {
            case 'encode':
                this.updateMethodInfo(document.getElementById('stego-method').value);
                break;
            case 'decode':
                // Préparation interface décodage
                break;
            case 'ultracrypte':
                // Vérification mot de passe s'il y en a un
                const ultraKey = document.getElementById('ultra-master-key').value;
                if (ultraKey) {
                    this.checkPasswordStrength(ultraKey);
                }
                break;
            case 'help':
                // Statistiques d'utilisation
                this.updateHelpStats();
                break;
        }
    }

    // ========== ENCODAGE ==========

    async handleEncode() {
        // Récupération des paramètres
        const carrierFile = this.currentFiles.carrier;
        const secretText = document.getElementById('secret-text').value.trim();
        const secretFile = this.currentFiles.secret;
        const stegoMethod = document.getElementById('stego-method').value;
        const cryptoLevel = document.getElementById('crypto-level').value;
        const password = document.getElementById('encode-password').value;

        // Validation des entrées
        const validation = this.validateEncodeInputs(carrierFile, secretText, secretFile, cryptoLevel, password);
        if (!validation.valid) {
            this.showMessage(validation.message, 'error');
            return;
        }

        try {
            this.showProgress('encode-progress', 'Préparation de l\'encodage...', 'encoding');

            // Préparation des données secrètes
            let secretData;
            if (secretFile) {
                this.updateProgress('encode-progress', 'Lecture du fichier secret...', 15);
                secretData = await this.fileToArrayBuffer(secretFile);
                secretData = new Uint8Array(secretData);
            } else {
                secretData = new TextEncoder().encode(secretText);
            }

            this.updateProgress('encode-progress', 'Données préparées...', 25);

            // Chiffrement si nécessaire
            if (cryptoLevel !== 'none' && password) {
                this.updateProgress('encode-progress', `Chiffrement ${cryptoLevel}...`, 40);
                
                if (cryptoLevel === 'aes') {
                    const encryptedData = await this.basicEncrypt(secretData, password);
                    secretData = encryptedData;
                } else if (cryptoLevel === 'ultra') {
                    // UltraCrypte si disponible
                    if (this.ultraCrypte && typeof this.ultraCrypte.encrypt === 'function') {
                        try {
                            const encryptedData = await this.ultraCrypte.encrypt(secretData, password);
                            secretData = encryptedData;
                        } catch (ultraError) {
                            // Fallback vers AES si UltraCrypte échoue
                            console.warn('UltraCrypte échec, fallback AES:', ultraError);
                            const encryptedData = await this.basicEncrypt(secretData, password);
                            secretData = encryptedData;
                        }
                    } else {
                        // Fallback vers AES
                        const encryptedData = await this.basicEncrypt(secretData, password);
                        secretData = encryptedData;
                    }
                }
            }

            // Stéganographie avec le moteur principal
            this.updateProgress('encode-progress', `Dissimulation via ${stegoMethod}...`, 75);

            const result = await this.steganographyEngine.hideData(carrierFile, secretData, stegoMethod, {
                quality: 'high',
                method: stegoMethod
            });

            // Vérification du résultat
            if (!result) {
                throw new Error('Résultat d\'encodage vide');
            }

            // Extraction du fichier selon la structure retournée
            let resultFile;
            if (result.file) {
                // Structure {file: Blob, method: string, metadata: object}
                resultFile = result.file;
            } else if (result instanceof Blob) {
                // Retour direct d'un Blob
                resultFile = result;
            } else {
                throw new Error('Format de résultat d\'encodage invalide');
            }

            // Vérification que le fichier est valide
            if (!resultFile || typeof resultFile.size === 'undefined') {
                throw new Error('Fichier résultat invalide');
            }

            // Finalisation
            this.updateProgress('encode-progress', 'Finalisation...', 100);
            
            setTimeout(() => {
                this.hideProgress('encode-progress', true);
                this.showEncodeResult(resultFile, stegoMethod, cryptoLevel);
            }, 500);

        } catch (error) {
            this.hideProgress('encode-progress', false);
            this.handleError(error, 'encodage');
        }
    }

    // MÉTHODE MANQUANTE - AJOUT CRITIQUE
    validateEncodeInputs(carrierFile, secretText, secretFile, cryptoLevel, password) {
        // Validation du fichier porteur
        if (!carrierFile) {
            return { 
                valid: false, 
                message: '❌ Veuillez sélectionner un fichier porteur (image, audio, vidéo ou document)' 
            };
        }

        // Validation du contenu secret
        if (!secretText && !secretFile) {
            return { 
                valid: false, 
                message: '❌ Veuillez entrer un message texte ou sélectionner un fichier à cacher' 
            };
        }

        // Si les deux sont fournis, privilégier le fichier
        if (secretText && secretFile) {
            this.showMessage('ℹ️ Fichier secret sélectionné, le texte sera ignoré', 'info');
        }

        // Validation du chiffrement
        if (cryptoLevel && cryptoLevel !== 'none') {
            if (!password || password.length === 0) {
                return { 
                    valid: false, 
                    message: '❌ Un mot de passe est requis pour le chiffrement' 
                };
            }

            // Validation spécifique pour UltraCrypte
            if (cryptoLevel === 'ultra' && password.length < 8) {
                return { 
                    valid: false, 
                    message: '❌ UltraCrypte nécessite un mot de passe d\'au moins 8 caractères' 
                };
            }

            // Validation pour AES
            if (cryptoLevel === 'aes' && password.length < 6) {
                return { 
                    valid: false, 
                    message: '❌ Le chiffrement AES nécessite un mot de passe d\'au moins 6 caractères' 
                };
            }
        }

        // Validation de la taille du fichier secret
        if (secretFile && secretFile.size > 50 * 1024 * 1024) { // 50MB max
            return { 
                valid: false, 
                message: '❌ Le fichier secret est trop volumineux (max 50MB)' 
            };
        }

        // Validation de la taille du message texte
        if (secretText && secretText.length > 1000000) { // 1M caractères max
            return { 
                valid: false, 
                message: '❌ Le message texte est trop long (max 1M caractères)' 
            };
        }

        // Estimation de capacité basique
        if (secretFile) {
            const estimatedCapacity = carrierFile.size * 0.1; // 10% approximatif
            if (secretFile.size > estimatedCapacity) {
                return { 
                    valid: false, 
                    message: `❌ Fichier secret trop volumineux pour ce porteur. Capacité estimée: ${this.formatFileSize(estimatedCapacity)}` 
                };
            }
        } else if (secretText) {
            const textSize = new TextEncoder().encode(secretText).length;
            const estimatedCapacity = carrierFile.size * 0.1;
            if (textSize > estimatedCapacity) {
                return { 
                    valid: false, 
                    message: `❌ Message texte trop long pour ce porteur. Capacité estimée: ${this.formatFileSize(estimatedCapacity)}` 
                };
            }
        }

        // Tout est valide
        return { valid: true };
    }

    // MÉTHODE MANQUANTE - AJOUT CRITIQUE
    mapCryptoComplexity(cryptoLevel) {
        const mapping = {
            'none': 'none',
            'aes': 'standard',
            'ultra': 'enhanced'
        };
        return mapping[cryptoLevel] || 'standard';
    }

    // ========== DÉCODAGE ==========

    async handleDecode() {
        const fileInput = document.getElementById('decode-file');
        const passwordInput = document.getElementById('decode-password');
        const detectionMode = document.getElementById('detection-mode');
        
        if (!this.currentFiles.decode) {
            this.showMessage('Veuillez sélectionner un fichier à décoder', 'error');
            return;
        }

        const password = passwordInput.value;
        const mode = detectionMode.value;
        
        this.showProgress('decode-progress', 'Analyse du fichier en cours...', 'decoding');
        
        try {
            this.updateProgress('decode-progress', 'Tentative d\'extraction des données...', 25);
            
            // Utilisation directe du moteur de stéganographie
            let extractedData = null;
            let usedMethod = 'unknown';
            let confidence = 0;
            
            if (mode === 'auto') {
                // Tentative automatique avec le moteur de stéganographie
                try {
                    this.updateProgress('decode-progress', 'Détection automatique en cours...', 50);
                    const result = await this.steganographyEngine.extractData(this.currentFiles.decode, 'auto');
                    
                    if (result && result.data && result.data.length > 0) {
                        extractedData = result.data;
                        usedMethod = result.method || 'lsb';
                        confidence = result.confidence || 75;
                    }
                } catch (error) {
                    console.log('Extraction automatique échouée:', error.message);
                    throw new Error(`Aucune donnée cachée détectée: ${error.message}`);
                }
            } else {
                // Méthode spécifique
                this.updateProgress('decode-progress', `Extraction avec ${mode}...`, 50);
                try {
                    const result = await this.steganographyEngine.extractData(this.currentFiles.decode, mode);
                    
                    if (result && result.data) {
                        extractedData = result.data;
                        usedMethod = mode;
                        confidence = result.confidence || 50;
                    }
                } catch (error) {
                    throw new Error(`Extraction avec ${mode} échouée: ${error.message}`);
                }
            }
            
            if (!extractedData || extractedData.length === 0) {
                this.hideProgress('decode-progress', false);
                this.showMessage('Aucune donnée cachée détectée avec les méthodes disponibles', 'warning');
                return;
            }
            
            this.updateProgress('decode-progress', 'Données extraites, traitement...', 75);
            
            // Tentative de déchiffrement si un mot de passe est fourni
            let finalData = extractedData;
            let cryptoType = 'Aucun';
            
            if (password) {
                try {
                    this.updateProgress('decode-progress', 'Déchiffrement en cours...', 85);
                    
                    // Conversion en string pour le déchiffrement si c'est des données binaires cryptées
                    let dataToDecrypt = extractedData;
                    if (extractedData instanceof Uint8Array) {
                        // Tentative de déchiffrement direct des bytes
                        const decryptedData = await this.basicDecrypt(extractedData, password);
                        finalData = new TextEncoder().encode(decryptedData);
                        cryptoType = 'AES-256-GCM';
                    }
                } catch (error) {
                    console.log('Déchiffrement échoué:', error.message);
                    // Si le déchiffrement échoue, on garde les données brutes
                    // Cela peut être normal si les données n'étaient pas chiffrées
                }
            }
            
            this.updateProgress('decode-progress', 'Finalisation...', 95);
            
            setTimeout(() => {
                this.hideProgress('decode-progress', true);
                this.showDecodeResult(finalData, usedMethod, cryptoType, confidence);
            }, 500);
            
        } catch (error) {
            this.hideProgress('decode-progress', false);
            this.handleError(error, 'décodage');
        }
    }

    // ========== ANALYSE ==========

    async handleAnalyze() {
        const fileInput = document.getElementById('decode-file');
        
        if (!this.currentFiles.decode) {
            this.showMessage('Veuillez sélectionner un fichier à analyser', 'error');
            return;
        }

        this.showProgress('decode-progress', 'Analyse forensique en cours...', 'analyzing');
        
        try {
            const fileBuffer = await this.fileToArrayBuffer(this.currentFiles.decode);
            const analysisResults = await this.performForensicAnalysis(fileBuffer);
            
            this.hideProgress('decode-progress', true);
            this.showAnalysisResults(analysisResults);
            
        } catch (error) {
            this.hideProgress('decode-progress', false);
            this.handleError(error, 'analyse forensique');
        }
    }

    async performForensicAnalysis(fileBuffer) {
        const uint8Array = new Uint8Array(fileBuffer);
        const results = {
            fileSize: uint8Array.length,
            entropy: this.calculateEntropy(uint8Array),
            signatures: this.detectSignatures(uint8Array),
            suspiciousPatterns: this.detectSuspiciousPatterns(uint8Array),
            possibleMethods: []
        };

        // Analyse des méthodes possibles
        if (results.signatures.includes('LSB_PATTERN')) {
            results.possibleMethods.push('LSB Steganography');
        }
        if (results.signatures.includes('METADATA_MARKER')) {
            results.possibleMethods.push('Metadata Hiding');
        }
        if (results.entropy > 7.5) {
            results.possibleMethods.push('Encrypted Data');
        }

        return results;
    }

    calculateEntropy(data) {
        const freq = new Array(256).fill(0);
        for (let byte of data) {
            freq[byte]++;
        }
        
        let entropy = 0;
        const len = data.length;
        for (let count of freq) {
            if (count > 0) {
                const p = count / len;
                entropy -= p * Math.log2(p);
            }
        }
        
        return entropy;
    }

    detectSignatures(data) {
        const signatures = [];
        const dataStr = new TextDecoder('utf-8', { fatal: false }).decode(data);
        
        if (dataStr.includes('CRYPTURA')) {
            signatures.push('METADATA_MARKER');
        }
        
        // Détection de patterns LSB
        let lsbPattern = 0;
        for (let i = 0; i < Math.min(1000, data.length); i++) {
            if ((data[i] & 1) !== (data[i] >> 1 & 1)) {
                lsbPattern++;
            }
        }
        
        if (lsbPattern > 400) { // Plus de 40% de variation dans les LSB
            signatures.push('LSB_PATTERN');
        }
        
        return signatures;
    }

    detectSuspiciousPatterns(data) {
        const patterns = [];
        
        // Recherche de données répétitives (indicateur de padding)
        let repeatedBytes = 0;
        for (let i = 1; i < Math.min(1000, data.length); i++) {
            if (data[i] === data[i-1]) {
                repeatedBytes++;
            }
        }
        
        if (repeatedBytes > 500) {
            patterns.push('Repeated byte patterns detected');
        }
        
        // Recherche de headers de fichiers cachés
        const commonHeaders = [
            [0xFF, 0xD8, 0xFF], // JPEG
            [0x89, 0x50, 0x4E, 0x47], // PNG
            [0x50, 0x4B, 0x03, 0x04], // ZIP
            [0x25, 0x50, 0x44, 0x46] // PDF
        ];
        
        for (let header of commonHeaders) {
            for (let i = 0; i < data.length - header.length; i++) {
                let match = true;
                for (let j = 0; j < header.length; j++) {
                    if (data[i + j] !== header[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    patterns.push(`Possible ${this.getFileTypeFromHeader(header)} file header at offset ${i}`);
                }
            }
        }
        
        return patterns;
    }

    getFileTypeFromHeader(header) {
        if (header[0] === 0xFF && header[1] === 0xD8) return 'JPEG';
        if (header[0] === 0x89 && header[1] === 0x50) return 'PNG';
        if (header[0] === 0x50 && header[1] === 0x4B) return 'ZIP';
        if (header[0] === 0x25 && header[1] === 0x50) return 'PDF';
        return 'Unknown';
    }

    showAnalysisResults(results) {
        const resultArea = document.getElementById('decode-result');
        const preview = document.getElementById('content-preview');
        
        // Création du contenu d'analyse
        const analysisHtml = `
            <div class="analysis-results">
                <h4>📊 Rapport d'Analyse Forensique</h4>
                
                <div class="analysis-section">
                    <h5>Informations Générales</h5>
                    <ul>
                        <li>Taille du fichier: ${this.formatFileSize(results.fileSize)}</li>
                        <li>Entropie: ${results.entropy.toFixed(2)} bits/octet</li>
                        <li>Niveau de complexité: ${results.entropy > 7.5 ? 'Élevé (possiblement chiffré)' : 'Normal'}</li>
                    </ul>
                </div>
                
                <div class="analysis-section">
                    <h5>Signatures Détectées</h5>
                    <ul>
                        ${results.signatures.length > 0 ? 
                            results.signatures.map(sig => `<li>${sig}</li>`).join('') : 
                            '<li>Aucune signature suspecte</li>'
                        }
                    </ul>
                </div>
                
                <div class="analysis-section">
                    <h5>Méthodes Possibles</h5>
                    <ul>
                        ${results.possibleMethods.length > 0 ? 
                            results.possibleMethods.map(method => `<li>${method}</li>`).join('') : 
                            '<li>Aucune méthode de stéganographie détectée</li>'
                        }
                    </ul>
                </div>
                
                <div class="analysis-section">
                    <h5>Patterns Suspects</h5>
                    <ul>
                        ${results.suspiciousPatterns.length > 0 ? 
                            results.suspiciousPatterns.map(pattern => `<li>${pattern}</li>`).join('') : 
                            '<li>Aucun pattern suspect détecté</li>'
                        }
                    </ul>
                </div>
            </div>
        `;
        
        preview.innerHTML = analysisHtml;
        
        // Mise à jour des informations
        document.getElementById('detected-type').textContent = 'Analyse Forensique';
        document.getElementById('extracted-size').textContent = this.formatFileSize(results.fileSize);
        document.getElementById('detected-crypto').textContent = results.entropy > 7.5 ? 'Possible' : 'Non détecté';
        
        // Masquer le bouton de sauvegarde
        document.getElementById('save-extracted').style.display = 'none';
        
        resultArea.style.display = 'block';
        resultArea.classList.add('fade-in');
        
        setTimeout(() => {
            resultArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }

    // ========== AFFICHAGE DES RÉSULTATS ==========

    showEncodeResult(resultFile, method, cryptoLevel) {
        // Vérifications de sécurité
        if (!resultFile) {
            this.showMessage('Erreur: Fichier résultat manquant', 'error');
            return;
        }

        if (typeof resultFile.size === 'undefined') {
            this.showMessage('Erreur: Fichier résultat invalide', 'error');
            return;
        }

        const resultArea = document.getElementById('encode-result');
        const filename = document.getElementById('result-filename');
        const size = document.getElementById('result-size');
        const methodSpan = document.getElementById('result-method');
        const downloadBtn = document.getElementById('download-btn');

        // Vérification des éléments DOM
        if (!resultArea || !filename || !size || !methodSpan || !downloadBtn) {
            this.showMessage('Erreur: Éléments d\'interface manquants', 'error');
            return;
        }

        // Correction : génération sécurisée du nom de fichier
        const finalName = this.generateOutputFilename(this.currentFiles.carrier, method);

        filename.textContent = finalName;
        size.textContent = this.formatFileSize(resultFile.size);
        methodSpan.textContent = `${this.getMethodName(method)} + ${cryptoLevel === 'none' ? 'Non chiffré' : cryptoLevel.toUpperCase()}`;

        // Configuration du téléchargement
        downloadBtn.onclick = () => {
            try {
                this.downloadFile(resultFile, finalName);
                this.showMessage('Fichier téléchargé avec succès!', 'success');
                this.filesProcessed++;
                this.updateStats();
            } catch (downloadError) {
                this.showMessage('Erreur lors du téléchargement', 'error');
                console.error('Download error:', downloadError);
            }
        };

        resultArea.style.display = 'block';
        resultArea.classList.add('fade-in');

        // Scroll vers le résultat
        setTimeout(() => {
            resultArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }

    showDecodeResult(data, method, cryptoType, confidence = 50) {
        const resultArea = document.getElementById('decode-result');
        const preview = document.getElementById('content-preview');
        const detectedType = document.getElementById('detected-type');
        const extractedSize = document.getElementById('extracted-size');
        const detectedCrypto = document.getElementById('detected-crypto');
        const saveBtn = document.getElementById('save-extracted');

        // Analyse intelligente du contenu pour déterminer le type
        const contentAnalysis = this.analyzeExtractedContent(data);
        
        // Mise à jour des informations de base
        detectedType.textContent = `${this.getMethodName(method)} (Confiance: ${confidence}%)`;
        extractedSize.textContent = this.formatFileSize(contentAnalysis.size);
        detectedCrypto.textContent = cryptoType;

        // Affichage selon le type de contenu
        if (contentAnalysis.isText) {
            this.displayTextMessage(preview, contentAnalysis.text, saveBtn);
        } else {
            this.displayFileContent(preview, data, contentAnalysis, saveBtn);
        }

        resultArea.style.display = 'block';
        resultArea.classList.add('fade-in');

        // Scroll vers le résultat
        setTimeout(() => {
            resultArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }

    analyzeExtractedContent(data) {
        let isText = false;
        let text = '';
        let fileType = 'binary';
        let size = 0;

        try {
            // Conversion en Uint8Array si nécessaire
            let bytes;
            if (typeof data === 'string') {
                bytes = new TextEncoder().encode(data);
                text = data;
                isText = true;
            } else if (data instanceof ArrayBuffer) {
                bytes = new Uint8Array(data);
            } else if (data instanceof Uint8Array) {
                bytes = data;
            } else {
                // Tentative de conversion
                bytes = new Uint8Array(data);
            }

            size = bytes.length;

            // Si ce n'est pas déjà identifié comme texte, tenter la détection
            if (!isText) {
                // Vérification des caractères pour déterminer si c'est du texte
                const textCheckSample = Math.min(bytes.length, 1000); // Échantillon de 1000 octets
                let textScore = 0;
                let totalChars = 0;

                for (let i = 0; i < textCheckSample; i++) {
                    const byte = bytes[i];
                    totalChars++;

                    // Caractères texte valides
                    if ((byte >= 32 && byte <= 126) || // ASCII imprimables
                        byte === 9 || byte === 10 || byte === 13) { // TAB, LF, CR
                        textScore++;
                    }
                    // Caractères UTF-8 valides
                    else if (byte >= 194 && byte <= 244) {
                        textScore += 0.5;
                    }
                }

                const textRatio = textScore / totalChars;

                // Si plus de 80% de caractères texte, considérer comme texte
                if (textRatio > 0.8) {
                    try {
                        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
                        isText = true;
                    } catch (e) {
                        // Échec du décodage UTF-8, traiter comme binaire
                        isText = false;
                    }
                } else {
                    // Détection du type de fichier par les headers
                    fileType = this.detectFileTypeFromHeader(bytes);
                }
            }

        } catch (error) {
            console.warn('Erreur lors de l\'analyse du contenu:', error);
            isText = false;
            size = data.length || data.byteLength || 0;
        }

        return {
            isText,
            text,
            fileType,
            size,
            data: data
        };
    }

    detectFileTypeFromHeader(bytes) {
        const header = Array.from(bytes.slice(0, 16))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('').toUpperCase();

        // Signatures de fichiers courantes
        const signatures = {
            '89504E47': 'PNG',
            'FFD8FF': 'JPEG',
            '47494638': 'GIF',
            '25504446': 'PDF',
            '504B0304': 'ZIP/Office',
            '52494646': 'WAV/AVI',
            '49444933': 'MP3',
            '664C6143': 'FLAC',
            '4F676753': 'OGG',
            '000001BA': 'MPEG',
            '000001B3': 'MPEG',
            '66747970': 'MP4/MOV'
        };

        for (const [sig, type] of Object.entries(signatures)) {
            if (header.startsWith(sig)) {
                return type;
            }
        }

        return 'Binary';
    }

    displayTextMessage(preview, text, saveBtn) {
        // Indicateur de type de contenu
        const typeIndicator = document.createElement('div');
        typeIndicator.className = 'content-type-indicator text';
        typeIndicator.innerHTML = '<i class="fas fa-comment-alt"></i> Message Texte Extrait';

        // Affichage du message texte
        const textDisplay = document.createElement('div');
        textDisplay.className = 'text-message-display';
        textDisplay.textContent = text;

        // Boutons d'action pour le texte
        const actions = document.createElement('div');
        actions.className = 'result-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn copy-text-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copier le Message';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(text).then(() => {
                this.showMessage('Message copié dans le presse-papiers!', 'success');
            }).catch(() => {
                this.showMessage('Erreur lors de la copie', 'error');
            });
        };

        const saveTextBtn = document.createElement('button');
        saveTextBtn.className = 'btn btn-secondary';
        saveTextBtn.innerHTML = '<i class="fas fa-download"></i> Sauvegarder comme Fichier';
        saveTextBtn.onclick = () => {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            const filename = `message_extrait_${timestamp}.txt`;
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            this.downloadFile(blob, filename);
            this.showMessage(`Message sauvegardé: ${filename}`, 'success');
        };

        actions.appendChild(copyBtn);
        actions.appendChild(saveTextBtn);

        // Remplacement du contenu
        preview.innerHTML = '';
        preview.appendChild(typeIndicator);
        preview.appendChild(textDisplay);
        preview.appendChild(actions);

        // Masquer le bouton de sauvegarde par défaut
        saveBtn.style.display = 'none';
    }

    displayFileContent(preview, data, analysis, saveBtn) {
        // Indicateur de type de contenu
        const typeIndicator = document.createElement('div');
        typeIndicator.className = 'content-type-indicator file';
        typeIndicator.innerHTML = `<i class="fas fa-file"></i> Fichier ${analysis.fileType} Extrait`;

        // Informations sur le fichier
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info-display';

        const infoGrid = document.createElement('div');
        infoGrid.className = 'file-preview-info';

        // Carte Type
        const typeCard = document.createElement('div');
        typeCard.className = 'info-card';
        typeCard.innerHTML = `
            <h4>Type de Fichier</h4>
            <p>${analysis.fileType}</p>
        `;

        // Carte Taille
        const sizeCard = document.createElement('div');
        sizeCard.className = 'info-card';
        sizeCard.innerHTML = `
            <h4>Taille</h4>
            <p>${this.formatFileSize(analysis.size)}</p>
        `;

        // Carte Aperçu
        const previewCard = document.createElement('div');
        previewCard.className = 'info-card';
        
        let previewContent = 'Données binaires';
        if (analysis.fileType === 'Binary') {
            // Affichage hexadécimal limité
            const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
            const hexPreview = Array.from(bytes.slice(0, 16))
                .map(b => b.toString(16).padStart(2, '0'))
                .join(' ').toUpperCase();
            previewContent = `${hexPreview}${bytes.length > 16 ? '...' : ''}`;
        }

        previewCard.innerHTML = `
            <h4>Aperçu</h4>
            <p style="font-family: monospace; font-size: 0.8rem;">${previewContent}</p>
        `;

        infoGrid.appendChild(typeCard);
        infoGrid.appendChild(sizeCard);
        infoGrid.appendChild(previewCard);
        fileInfo.appendChild(infoGrid);

        // Remplacement du contenu
        preview.innerHTML = '';
        preview.appendChild(typeIndicator);
        preview.appendChild(fileInfo);

        // Configuration du bouton de téléchargement
        saveBtn.style.display = 'inline-flex';
        saveBtn.onclick = () => {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            let filename = `fichier_extrait_${timestamp}`;
            
            // Extension basée sur le type détecté
            const extensions = {
                'PNG': '.png',
                'JPEG': '.jpg',
                'GIF': '.gif',
                'PDF': '.pdf',
                'ZIP/Office': '.zip',
                'WAV/AVI': '.wav',
                'MP3': '.mp3',
                'FLAC': '.flac',
                'OGG': '.ogg',
                'MPEG': '.mpg',
                'MP4/MOV': '.mp4'
            };

            filename += extensions[analysis.fileType] || '.bin';

            let blob;
            if (data instanceof Uint8Array) {
                blob = new Blob([data]);
            } else if (data instanceof ArrayBuffer) {
                blob = new Blob([data]);
            } else {
                blob = new Blob([new Uint8Array(data)]);
            }

            this.downloadFile(blob, filename);
            this.showMessage(`Fichier téléchargé: ${filename}`, 'success');
        };
    }

    prepareContentPreview(data) {
        let displayText = '';
        let isText = true;

        try {
            // Tentative de décodage en UTF-8
            displayText = new TextDecoder('utf-8').decode(data);

            // Vérification si c'est du texte lisible
            if (displayText.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/)) {
                isText = false;
            }
        } catch (error) {
            isText = false;
        }

        if (!isText) {
            // Affichage hexadécimal pour les données binaires
            const maxBytes = 256; // Limite d'affichage
            const bytesToShow = Math.min(data.length, maxBytes);
            const hexLines = [];

            for (let i = 0; i < bytesToShow; i += 16) {
                const chunk = data.slice(i, i + 16);
                const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
                const ascii = Array.from(chunk).map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join('');
                hexLines.push(`${i.toString(16).padStart(4, '0')}: ${hex.padEnd(48)} | ${ascii}`);
            }

            if (data.length > 16) {
                hexLines.push(`... et ${data.length - 16} octets supplémentaires`);
            }

            displayText = hexLines.join('\n');
        }

        // Limitation de la taille d'affichage
        if (displayText.length > 5000) {
            displayText = displayText.substring(0, 5000) + '\n... [contenu tronqué]';
        }

        return {
            html: `<pre>${this.escapeHtml(displayText)}</pre>`,
            isText: isText
        };
    }

    // ========== UTILITAIRES D'INTERFACE ==========

    showProgress(progressId, message, type = 'default') {
        const progressElement = document.getElementById(progressId);
        const textElement = progressElement.querySelector('.progress-text');
        const progressBar = progressElement.querySelector('.progress-fill');

        // Réinitialiser les classes
        progressElement.className = 'progress-container active';
        if (type !== 'default') {
            progressElement.classList.add(type);
        }

        textElement.textContent = message;
        textElement.classList.add('active');
        progressElement.style.display = 'block';

        // Animation de la barre de progression avec pourcentage
        let width = 0;
        const interval = setInterval(() => {
            if (width >= 90) {
                clearInterval(interval);
            } else {
                width += Math.random() * 8 + 2; // Progression plus fluide
                const finalWidth = Math.min(width, 90);
                progressBar.style.width = `${finalWidth}%`;
                
                // Ajouter le pourcentage si l'élément existe
                const percentageElement = progressElement.querySelector('.progress-percentage');
                if (percentageElement) {
                    percentageElement.textContent = `${Math.floor(finalWidth)}%`;
                }
            }
        }, 200);

        progressElement.dataset.interval = interval;
    }

    updateProgress(progressId, message, percentage) {
        const progressElement = document.getElementById(progressId);
        const textElement = progressElement.querySelector('.progress-text');
        const progressBar = progressElement.querySelector('.progress-fill');

        if (progressElement.style.display === 'block') {
            textElement.textContent = message;
            
            if (percentage !== undefined) {
                progressBar.style.width = `${percentage}%`;
                const percentageElement = progressElement.querySelector('.progress-percentage');
                if (percentageElement) {
                    percentageElement.textContent = `${percentage}%`;
                }
            }
        }
    }

    hideProgress(progressId, success = true) {
        const progressElement = document.getElementById(progressId);
        const interval = progressElement.dataset.interval;
        const progressBar = progressElement.querySelector('.progress-fill');
        const textElement = progressElement.querySelector('.progress-text');

        if (interval) {
            clearInterval(interval);
        }

        // Compléter la barre avec le bon état
        if (success) {
            progressElement.classList.add('success');
            textElement.textContent = 'Terminé avec succès!';
        } else {
            progressElement.classList.add('error');
            textElement.textContent = 'Erreur lors du traitement';
        }
        
        progressBar.style.width = '100%';
        textElement.classList.remove('active');

        setTimeout(() => {
            progressElement.style.display = 'none';
            progressBar.style.width = '0%';
            progressElement.className = 'progress-container';
        }, success ? 1500 : 3000);
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const icon = type === 'error' ? 'exclamation-triangle' : 
                    type === 'success' ? 'check-circle' : 
                    type === 'warning' ? 'exclamation-triangle' : 'info-circle';

        messageDiv.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;

        // Insertion au début du contenu principal
        const mainContent = document.querySelector('.main-content');
        mainContent.insertBefore(messageDiv, mainContent.firstChild);

        // Suppression automatique
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, type === 'error' ? 8000 : 5000);

        // Animation d'entrée
        messageDiv.classList.add('fade-in');
    }

    clearMessages() {
        const messages = document.querySelectorAll('.message');
        messages.forEach(msg => {
            if (msg.parentNode) {
                msg.parentNode.removeChild(msg);
            }
        });
    }

    togglePasswordVisibility(e) {
        const input = e.target.closest('.password-input').querySelector('input');
        const icon = e.target.closest('.toggle-password').querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    checkPasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');
        const entropyElement = document.getElementById('key-entropy');

        if (!strengthBar || !strengthText) return;

        let score = 0;
        const feedback = [];

        // Critères de notation
        if (password.length >= 8) score += 20;
        if (password.length >= 12) score += 15;
        if (password.length >= 20) score += 15;
        else feedback.push('20+ caractères recommandés');

        if (/[a-z]/.test(password)) score += 10;
        else feedback.push('Minuscules manquantes');

        if (/[A-Z]/.test(password)) score += 10;
        else feedback.push('Majuscules manquantes');

        if (/[0-9]/.test(password)) score += 10;
        else feedback.push('Chiffres manquants');

        if (/[^a-zA-Z0-9]/.test(password)) score += 15;
        else feedback.push('Caractères spéciaux manquants');

        if (/(.)\1{2,}/.test(password)) score -= 10; // Répétitions
        if (password.toLowerCase().includes('password')) score -= 20;

        // Calcul de l'entropie approximative
        const entropy = Math.floor(password.length * Math.log2(this.getCharsetSize(password)));

        // Mise à jour visuelle
        strengthBar.style.width = `${score}%`;

        let level, color;
        if (score < 30) {
            level = 'Très faible';
            color = '#ef4444';
        } else if (score < 50) {
            level = 'Faible';
            color = '#f59e0b';
        } else if (score < 75) {
            level = 'Correct';
            color = '#3b82f6';
        } else {
            level = 'Excellent';
            color = '#10b981';
        }

        strengthBar.style.background = color;
        strengthText.textContent = level;
        strengthText.title = feedback.join(', ');
        
        if (entropyElement) {
            entropyElement.textContent = `${entropy} bits d'entropie`;
        }
    }

    getCharsetSize(password) {
        let size = 0;
        if (/[a-z]/.test(password)) size += 26;
        if (/[A-Z]/.test(password)) size += 26;
        if (/[0-9]/.test(password)) size += 10;
        if (/[^a-zA-Z0-9]/.test(password)) size += 32;
        return Math.max(size, 1);
    }

    // Nouvelles méthodes pour UltraCrypte
    async handleUltraEncrypt() {
        const masterKey = document.getElementById('ultra-master-key').value;
        const ultraFile = this.currentFiles.ultra;
        const textInput = document.getElementById('ultra-text-input').value.trim();
        const securityLevel = document.querySelector('input[name="security-level"]:checked')?.value || 'standard';
        
        if (!masterKey) {
            this.showMessage('Veuillez saisir une clé maître', 'error');
            return;
        }

        if (!ultraFile && !textInput) {
            this.showMessage('Veuillez sélectionner un fichier ou saisir un message', 'error');
            return;
        }

        // Logique de chiffrement UltraCrypte
        this.showMessage('Chiffrement UltraCrypte en cours...', 'info');
        
        try {
            let data;
            if (ultraFile) {
                data = await this.fileToArrayBuffer(ultraFile);
            } else {
                data = new TextEncoder().encode(textInput);
            }

            // Options de chiffrement
            const options = {
                level: securityLevel,
                compress: document.getElementById('ultra-compress')?.checked || false,
                stealth: document.getElementById('ultra-stealth')?.checked || false,
                deniable: document.getElementById('ultra-deniable')?.checked || false
            };

            const encrypted = await this.ultraCrypte.encrypt(data, masterKey, options);
            
            const filename = ultraFile ? 
                `${ultraFile.name.split('.')[0]}_ultra.ucrypt` : 
                `message_ultra_${Date.now()}.ucrypt`;
            
            this.downloadFile(new Blob([encrypted]), filename);
            this.showMessage('Chiffrement UltraCrypte terminé avec succès!', 'success');
            
        } catch (error) {
            this.showMessage(`Erreur de chiffrement: ${error.message}`, 'error');
        }
    }

    async handleUltraDecrypt() {
        const masterKey = document.getElementById('ultra-master-key').value;
        const ultraFile = this.currentFiles.ultra;
        
        if (!masterKey) {
            this.showMessage('Veuillez saisir la clé maître', 'error');
            return;
        }

        if (!ultraFile) {
            this.showMessage('Veuillez sélectionner un fichier chiffré', 'error');
            return;
        }

        this.showMessage('Déchiffrement UltraCrypte en cours...', 'info');
        
        try {
            const encryptedData = await this.fileToArrayBuffer(ultraFile);
            const decrypted = await this.ultraCrypte.decrypt(encryptedData, masterKey);
            
            const filename = ultraFile.name.replace('.ucrypt', '_decrypted');
            this.downloadFile(new Blob([decrypted]), filename);
            this.showMessage('Déchiffrement UltraCrypte terminé avec succès!', 'success');
            
        } catch (error) {
            this.showMessage(`Erreur de déchiffrement: ${error.message}`, 'error');
        }
    }

    // Méthode handleError améliorée
    handleError(error, context = 'application') {
        console.error(`❌ Erreur dans ${context}:`, error);
        
        let message = 'Une erreur inattendue s\'est produite';
        
        // Gestion des erreurs null/undefined - CORRECTION
        if (!error) {
            message = 'Erreur inconnue - objet d\'erreur null';
            console.warn('handleError appelé avec error null/undefined');
        } else if (error && error.message) {
            if (error.message.includes('network') || error.message.includes('fetch')) {
                message = 'Erreur de connexion réseau';
            } else if (error.message.includes('permission') || error.message.includes('denied')) {
                message = 'Erreur de permissions';
            } else if (error.message.includes('memory') || error.message.includes('size')) {
                message = 'Erreur de mémoire - fichier trop volumineux';
            } else if (error.message.includes('Cannot read properties')) {
                message = 'Erreur de données - fichier corrompu ou manquant';
            } else if (error.message.includes('undefined')) {
                message = 'Erreur de données - propriété manquante';
            } else {
                message = error.message;
            }
        } else if (typeof error === 'string') {
            message = error;
        } else {
            // Erreur d'un type inattendu
            message = 'Erreur de type inattendu';
            console.warn('Erreur non-standard:', typeof error, error);
        }
        
        this.showMessage(`${message} (${context})`, 'error');
        
        // Log détaillé pour le debug
        if (localStorage.getItem('cryptura_debug') === 'true') {
            console.group('🔍 Debug Error Details');
            console.log('Context:', context);
            console.log('Error Object:', error);
            console.log('Error Type:', typeof error);
            console.log('Stack Trace:', error?.stack);
            console.groupEnd();
        }
    }

    // ========== GESTION DES RÉINITIALISATIONS ==========

    resetEncode() {
        // Reset des fichiers
        this.currentFiles.carrier = null;
        
        // Reset des zones d'upload
        const carrierUpload = document.getElementById('carrier-upload');
        const secretTextarea = document.getElementById('secret-text');
        
        if (carrierUpload) {
            carrierUpload.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <h3>Fichier Porteur</h3>
                <p>Glissez votre média ou cliquez pour sélectionner</p>
                <small>Images • Audio • Vidéo • Documents</small>
            `;
        }
        
        if (secretTextarea) {
            secretTextarea.value = '';
        }
        
        // Reset des champs
        document.getElementById('encode-password').value = '';
        document.getElementById('crypto-level').value = 'none';
        
        // Masquer les résultats
        const resultArea = document.getElementById('encode-result');
        if (resultArea) resultArea.style.display = 'none';
        
        this.showMessage('Encodage réinitialisé', 'info');
    }

    cancelOperations() {
        // Annulation des opérations en cours
        const progressElements = document.querySelectorAll('.progress-container[style*="block"]');
        progressElements.forEach(progress => {
            this.hideProgress(progress.id);
        });

        this.showMessage('Opérations annulées', 'warning');
    }

    // ========== CHIFFREMENT DE BASE ==========

    async basicEncrypt(data, password) {
        const encoder = new TextEncoder();
        
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );
        
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
        
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const dataToEncrypt = data instanceof Uint8Array ? data : encoder.encode(data);
        
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            dataToEncrypt
        );
        
        const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        result.set(salt, 0);
        result.set(iv, salt.length);
        result.set(new Uint8Array(encrypted), salt.length + iv.length);
        
        return result;
    }

    async basicDecrypt(encryptedData, password) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        let dataToDecrypt = encryptedData;
        if (typeof encryptedData === 'string') {
            // Si c'est une string, on essaie de la décoder
            try {
                dataToDecrypt = new Uint8Array(encryptedData.split(',').map(x => parseInt(x)));
            } catch (e) {
                dataToDecrypt = encoder.encode(encryptedData);
            }
        } else if (!(encryptedData instanceof Uint8Array)) {
            dataToDecrypt = new Uint8Array(encryptedData);
        }
        
        if (dataToDecrypt.length < 28) {
            throw new Error('Données chiffrées trop courtes');
        }
        
        const salt = dataToDecrypt.slice(0, 16);
        const iv = dataToDecrypt.slice(16, 28);
        const encrypted = dataToDecrypt.slice(28);
        
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encrypted
        );
        
        return decoder.decode(decrypted);
    }

    // ========== UTILITAIRES ==========

    updateMethodInfo(method) {
        // Mise à jour des informations contextuelles selon la méthode
        if (this.currentFiles.carrier) {
            const capacity = this.steganography.getCapacity(this.currentFiles.carrier, method);
            if (capacity > 0) {
                this.showMessage(`💾 Capacité ${method.toUpperCase()}: ${this.formatFileSize(capacity)}`, 'info');
            }
        }
    }

    updateCryptoInfo(level) {
        const infoMessages = {
            'none': 'Aucun chiffrement - Données en clair',
            'aes': 'Chiffrement AES-256-GCM standard',
            'ultra': 'UltraCrypte - Sécurité maximale post-quantique'
        };

        if (infoMessages[level]) {
            this.showMessage(`🔐 ${infoMessages[level]}`, 'info');
        }
    }

    updateOptionsInfo() {
        // Informations sur les options avancées
        const options = [];
        if (document.getElementById('compress-data')?.checked) options.push('Compression');
        if (document.getElementById('add-noise')?.checked) options.push('Bruit');
        if (document.getElementById('multi-layer')?.checked) options.push('Multi-couches');

        if (options.length > 0) {
            this.showMessage(`⚙️ Options: ${options.join(', ')}`, 'info');
        }
    }

    updateHelpStats() {
        const statsElement = document.querySelector('#help-panel .help-content');
        if (statsElement) {
            const currentStats = `
                <div class="stats-section">
                    <h4>📊 Statistiques de session</h4>
                    <ul>
                        <li>Fichiers traités: ${this.filesProcessed}</li>
                        <li>Session démarrée: ${new Date().toLocaleString()}</li>
                        <li>Méthodes disponibles: ${Object.keys(this.steganography.methods).length}</li>
                    </ul>
                </div>
            `;
            // Ajout après le contenu existant si pas déjà présent
            if (!statsElement.querySelector('.stats-section')) {
                statsElement.insertAdjacentHTML('beforeend', currentStats);
            }
        }
    }

    getMethodName(method) {
        const methods = {
            'lsb': 'LSB (Least Significant Bit)',
            'metadata': 'Métadonnées',
            'audio-spread': 'Dispersion Audio',
            'video-frame': 'Frames Vidéo',
            'document-hidden': 'Document Caché',
            'auto': 'Détection Automatique',
            'brute': 'Force Brute'
        };

        return methods[method] || method.charAt(0).toUpperCase() + method.slice(1);
    }

    generateOutputFilename(originalFile, method) {
        // Vérification de sécurité pour éviter les erreurs
        if (!originalFile || !originalFile.name) {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            return `cryptura_encoded_${method}_${timestamp}.bin`;
        }

        try {
            const baseName = originalFile.name.replace(/\.[^.]+$/, '');
            const extension = originalFile.name.split('.').pop();
            return `${baseName}_cryptura_${method}.${extension}`;
        } catch (error) {
            console.warn('Erreur génération nom de fichier:', error);
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            return `cryptura_encoded_${method}_${timestamp}.bin`;
        }
    }

    generateExtractedFilename(data) {
        // Tentative de détection du type de fichier extrait
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');

        // Headers de fichiers courants
        const fileHeaders = {
            '\x89PNG': 'png',
            'GIF8': 'gif',
            '\xFF\xD8\xFF': 'jpg',
            'PK\x03\x04': 'zip',
            '%PDF': 'pdf'
        };

        try {
            const dataStr = String.fromCharCode(...data.slice(0, 10));
            for (const [header, ext] of Object.entries(fileHeaders)) {
                if (dataStr.startsWith(header)) {
                    return `extracted_${timestamp}.${ext}`;
                }
            }

            // Tentative de détection texte
            const text = new TextDecoder('utf-8').decode(data.slice(0, 100));
            if (!/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(text)) {
                return `extracted_message_${timestamp}.txt`;
            }
        } catch (e) {
            // Pas du texte ou erreur de décodage
        }

        return `extracted_${timestamp}.bin`;
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    updateStats() {
        const statsElement = document.getElementById('files-processed');
        if (statsElement) {
            statsElement.textContent = `${this.filesProcessed} fichiers traités`;
        }
        
        // Mise à jour du titre de la page
        document.title = `Cryptura - ${this.filesProcessed} fichiers traités`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // MÉTHODE MANQUANTE AJOUTÉE
    initScrollEffects() {
        // Effet de parallaxe et d'animation au scroll
        let lastScrollY = 0;
        let ticking = false;

        const updateScrollEffects = () => {
            const currentScrollY = window.scrollY;
            const navbar = document.querySelector('.nav-container');
            
            // Effet de navbar au scroll
            if (navbar) {
                if (currentScrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            }

            // Animation des éléments visibles
            const animateElements = document.querySelectorAll('.card, .form-section, .upload-zone');
            animateElements.forEach(element => {
                const rect = element.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
                
                if (isVisible && !element.classList.contains('animate-in')) {
                    element.classList.add('animate-in');
                }
            });

            lastScrollY = currentScrollY;
            ticking = false;
        };

        const requestScrollUpdate = () => {
            if (!ticking) {
                requestAnimationFrame(updateScrollEffects);
                ticking = true;
            }
        };

        window.addEventListener('scroll', requestScrollUpdate, { passive: true });
        
        // Exécution initiale
        updateScrollEffects();
    }
}

// ========== INITIALISATION ==========

// Initialisation de l'application au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new CrypturaApp();
    } catch (error) {
        console.error('Erreur d\'initialisation:', error);
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: Inter, sans-serif;">
                <h1 style="color: #ef4444; margin-bottom: 1rem;">⚠️ Erreur d'initialisation</h1>
                <p style="color: #64748b; margin-bottom: 2rem;">Impossible de charger l'application Cryptura</p>
                <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                    🔄 Recharger la page
                </button>
            </div>
        `;
    }
});

// Gestion des erreurs globales
window.addEventListener('error', (e) => {
    if (window.app) {
        window.app.handleError(e.error, 'Cryptura');
    }
});

window.addEventListener('unhandledrejection', (e) => {
    if (window.app) {
        window.app.handleError({ message: e.reason }, 'Cryptura promesse asynchrone');
    }
    e.preventDefault();
});

// ========== EXPORT ==========

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrypturaApp;
}