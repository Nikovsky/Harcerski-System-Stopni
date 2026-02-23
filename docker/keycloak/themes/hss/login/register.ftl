<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('firstName','lastName','email','username','password','password-confirm') ; section>

    <#if section = "header">
    <#-- header is unused, we render everything in form -->

    <#elseif section = "form">
        <div class="hss-card">
            <div class="hss-card-header">
                <div class="hss-logo">
                    <img src="${url.resourcesPath}/img/logo.svg" alt="HSS Logo" />
                </div>
                <h1 class="hss-title">${msg("registerTitle")}</h1>
                <p class="hss-subtitle">${msg("registerSubtitle", "Harcerski System Stopni")}</p>
            </div>

            <#if messagesPerField.existsError('firstName','lastName','email','username','password','password-confirm')>
                <div class="hss-alert hss-alert-error">
                    <#list ['firstName','lastName','email','username','password','password-confirm'] as field>
                        <#if messagesPerField.existsError(field)>
                            <span>${kcSanitize(messagesPerField.get(field))?no_esc}</span><br/>
                        </#if>
                    </#list>
                </div>
            </#if>

            <#if message?has_content && message.type = 'success'>
                <div class="hss-alert hss-alert-success">
                    <span>${kcSanitize(message.summary)?no_esc}</span>
                </div>
            </#if>

            <form id="kc-register-form" class="hss-form" action="${url.registrationAction}" method="post">

                <div class="hss-form-group">
                    <label for="email" class="hss-label">${msg("email")}</label>
                    <div class="hss-input-wrapper">
                        <span class="material-icons hss-input-icon">mail</span>
                        <input tabindex="1" id="email" name="email" value="${(register.formData.email!'')}" type="email" autocomplete="email"
                               class="hss-input <#if messagesPerField.existsError('email')>hss-input-error</#if>"
                               placeholder="${msg("email")}" />
                    </div>
                    <div id="hint-email" class="hss-field-hint"></div>
                </div>

                <#if !realm.registrationEmailAsUsername>
                    <div class="hss-form-group">
                        <label for="username" class="hss-label">${msg("username")}</label>
                        <div class="hss-input-wrapper">
                            <span class="material-icons hss-input-icon">person</span>
                            <input tabindex="2" id="username" name="username" value="${(register.formData.username!'')}" type="text" autocomplete="username"
                                   class="hss-input <#if messagesPerField.existsError('username')>hss-input-error</#if>"
                                   placeholder="${msg("username")}" />
                        </div>
                        <div id="hint-username" class="hss-field-hint"></div>
                    </div>
                </#if>

                <div class="hss-form-group">
                    <label for="password" class="hss-label">${msg("password")}</label>
                    <div class="hss-input-wrapper">
                        <span class="material-icons hss-input-icon">lock</span>
                        <input tabindex="3" id="password" name="password" type="password" autocomplete="new-password"
                               class="hss-input hss-input-password <#if messagesPerField.existsError('password')>hss-input-error</#if>"
                               placeholder="••••••••" />
                        <button type="button" class="hss-password-toggle" onclick="togglePassword('password', this)" aria-label="Pokaż/ukryj hasło">
                            <span class="material-icons eye-open">visibility_off</span>
                            <span class="material-icons eye-closed" style="display:none">visibility</span>
                        </button>
                    </div>
                    <div id="password-strength" class="hss-strength-bar">
                        <div class="hss-strength-segment"></div>
                        <div class="hss-strength-segment"></div>
                        <div class="hss-strength-segment"></div>
                        <div class="hss-strength-segment"></div>
                    </div>
                    <div id="hint-password" class="hss-field-hint"></div>
                </div>

                <div class="hss-form-group">
                    <label for="password-confirm" class="hss-label">${msg("passwordConfirm")}</label>
                    <div class="hss-input-wrapper">
                        <span class="material-icons hss-input-icon">lock</span>
                        <input tabindex="4" id="password-confirm" name="password-confirm" type="password" autocomplete="new-password"
                               class="hss-input hss-input-password <#if messagesPerField.existsError('password-confirm')>hss-input-error</#if>"
                               placeholder="••••••••" />
                        <button type="button" class="hss-password-toggle" onclick="togglePassword('password-confirm', this)" aria-label="Pokaż/ukryj hasło">
                            <span class="material-icons eye-open">visibility_off</span>
                            <span class="material-icons eye-closed" style="display:none">visibility</span>
                        </button>
                    </div>
                    <div id="hint-confirm" class="hss-field-hint"></div>
                </div>

                <#if recaptchaRequired??>
                    <div class="hss-form-group">
                        <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}"></div>
                    </div>
                </#if>

                <button tabindex="5" id="register-btn" class="hss-btn-primary" type="submit" disabled>
                    <span class="hss-btn-text">${msg("doRegister")}</span>
                    <span class="material-icons">arrow_forward</span>
                    <span class="hss-btn-spinner"></span>
                </button>

            </form>

            <#if realm.password && social.providers??>
                <div class="hss-social-providers">
                    <#list social.providers as p>
                        <a id="social-${p.alias}" class="hss-btn-social hss-btn-social-${p.alias}" href="${p.loginUrl}">
                            <#if p.alias == "google">
                                <svg class="hss-social-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                            <#else>
                                <span class="material-icons hss-social-icon-fallback">login</span>
                            </#if>
                            <span>Kontynuuj z ${p.displayName}</span>
                        </a>
                    </#list>
                </div>
            </#if>

            <div class="hss-divider">
                <div class="hss-divider-line"></div>
            </div>

            <div class="hss-card-footer">
                <p>
                    ${msg("alreadyHaveAccount", "Masz już konto?")}
                    <a tabindex="6" class="hss-link-register" href="${url.loginUrl}">${msg("doLogIn")}</a>
                </p>
            </div>
        </div>

        <footer class="hss-page-footer">
            <div class="hss-footer-links">
                <a href="https://hss.local" class="hss-footer-home">
                    <span class="material-icons">arrow_back</span>
                    Strona główna
                </a>
                <span class="sep">•</span>
                <a href="#">Polityka Prywatności</a>
                <span class="sep">•</span>
                <a href="#">Regulamin</a>
            </div>
            <p>&copy; ${.now?string('yyyy')} Związek Harcerstwa Rzeczypospolitej. Wszelkie prawa zastrzeżone.</p>
        </footer>

        <script>
            function togglePassword(inputId, btn) {
                var input = document.getElementById(inputId);
                var eyeOpen = btn.querySelector('.eye-open');
                var eyeClosed = btn.querySelector('.eye-closed');
                if (input.type === 'password') {
                    input.type = 'text';
                    eyeOpen.style.display = 'none';
                    eyeClosed.style.display = 'inline';
                } else {
                    input.type = 'password';
                    eyeOpen.style.display = 'inline';
                    eyeClosed.style.display = 'none';
                }
            }

            (function() {
                var emailInput = document.getElementById('email');
                var usernameInput = document.getElementById('username');
                var passwordInput = document.getElementById('password');
                var confirmInput = document.getElementById('password-confirm');
                var submitBtn = document.getElementById('register-btn');

                var hintEmail = document.getElementById('hint-email');
                var hintUsername = document.getElementById('hint-username');
                var hintPassword = document.getElementById('hint-password');
                var hintConfirm = document.getElementById('hint-confirm');
                var strengthBar = document.getElementById('password-strength');

                var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                var strengthLabels = ['', 'Słabe', 'Przeciętne', 'Dobre', 'Silne'];

                function getPasswordStrength(pass) {
                    if (!pass) return 0;
                    var score = 0;
                    if (pass.length >= 8) score++;
                    if (pass.length >= 12) score++;
                    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
                    if (/\d/.test(pass)) score++;
                    if (/[^a-zA-Z0-9]/.test(pass)) score++;
                    if (score <= 1) return 1;
                    if (score <= 2) return 2;
                    if (score <= 3) return 3;
                    return 4;
                }

                function updateStrengthBar(pass) {
                    if (!strengthBar) return;
                    if (!pass || pass.length === 0) {
                        strengthBar.classList.remove('visible');
                        strengthBar.setAttribute('data-level', '0');
                        return;
                    }
                    var level = getPasswordStrength(pass);
                    strengthBar.setAttribute('data-level', level);
                    strengthBar.classList.add('visible');
                    return level;
                }

                // Track whether a field has been touched (user started typing)
                var touched = { email: false, username: false, password: false, confirm: false };

                var icons = { error: 'error_outline', ok: 'check_circle' };

                function setHint(el, state, msg, customIcon) {
                    if (!el) return;
                    if (!state || !msg) {
                        el.classList.remove('visible');
                        el.setAttribute('data-state', '');
                        return;
                    }
                    var icon = customIcon || icons[state] || '';
                    el.innerHTML = (icon ? '<span class="material-icons">' + icon + '</span>' : '') + msg;
                    el.setAttribute('data-state', state);
                    el.classList.add('visible');
                }

                function setInputState(input, state) {
                    if (!input) return;
                    input.classList.remove('hss-input-error', 'hss-input-ok');
                    if (state) input.classList.add('hss-input-' + state);
                }

                function validate() {
                    var valid = true;

                    // Email
                    var emailVal = emailInput ? emailInput.value.trim() : '';
                    if (touched.email) {
                        if (emailVal.length === 0) {
                            setHint(hintEmail, 'error', 'Podaj adres e-mail');
                            setInputState(emailInput, 'error');
                            valid = false;
                        } else if (!emailRegex.test(emailVal)) {
                            setHint(hintEmail, 'error', 'Nieprawidłowy format adresu e-mail');
                            setInputState(emailInput, 'error');
                            valid = false;
                        } else {
                            setHint(hintEmail, 'ok', 'Adres e-mail poprawny');
                            setInputState(emailInput, 'ok');
                        }
                    } else {
                        setHint(hintEmail, '', '');
                        setInputState(emailInput, '');
                        valid = false;
                    }

                    // Username (only if field exists)
                    if (usernameInput) {
                        var usernameVal = usernameInput.value.trim();
                        if (touched.username) {
                            if (usernameVal.length === 0) {
                                setHint(hintUsername, 'error', 'Podaj nazwę użytkownika');
                                setInputState(usernameInput, 'error');
                                valid = false;
                            } else {
                                setHint(hintUsername, 'ok', 'Nazwa użytkownika OK');
                                setInputState(usernameInput, 'ok');
                            }
                        } else {
                            setHint(hintUsername, '', '');
                            setInputState(usernameInput, '');
                            valid = false;
                        }
                    }

                    // Password
                    var passVal = passwordInput ? passwordInput.value : '';
                    if (touched.password) {
                        var strength = updateStrengthBar(passVal);
                        if (passVal.length === 0) {
                            setHint(hintPassword, 'error', 'Podaj hasło');
                            setInputState(passwordInput, 'error');
                            valid = false;
                        } else if (passVal.length < 8) {
                            setHint(hintPassword, 'error', 'Min. 8 znaków — wpisano ' + passVal.length + '/8');
                            setInputState(passwordInput, 'error');
                            valid = false;
                        } else {
                            var label = strengthLabels[strength] || 'OK';
                            var hintState = strength >= 3 ? 'ok' : 'warn';
                            var icon = strength >= 3 ? 'check_circle' : 'info';
                            setHint(hintPassword, hintState, 'Siła hasła: ' + label, icon);
                            setInputState(passwordInput, strength >= 3 ? 'ok' : '');
                        }
                    } else {
                        setHint(hintPassword, '', '');
                        setInputState(passwordInput, '');
                        updateStrengthBar('');
                        valid = false;
                    }

                    // Confirm password
                    var confirmVal = confirmInput ? confirmInput.value : '';
                    if (touched.confirm) {
                        if (confirmVal.length === 0) {
                            setHint(hintConfirm, 'error', 'Powtórz hasło');
                            setInputState(confirmInput, 'error');
                            valid = false;
                        } else if (confirmVal !== passVal) {
                            setHint(hintConfirm, 'error', 'Hasła nie są identyczne');
                            setInputState(confirmInput, 'error');
                            valid = false;
                        } else {
                            setHint(hintConfirm, 'ok', 'Hasła się zgadzają');
                            setInputState(confirmInput, 'ok');
                        }
                    } else {
                        setHint(hintConfirm, '', '');
                        setInputState(confirmInput, '');
                        valid = false;
                    }

                    submitBtn.disabled = !valid;
                }

                function bindField(input, key) {
                    if (!input) return;
                    input.addEventListener('input', function() {
                        touched[key] = true;
                        validate();
                    });
                    // Also validate on blur for fields user tabbed through
                    input.addEventListener('blur', function() {
                        if (input.value.length > 0) touched[key] = true;
                        validate();
                    });
                }

                bindField(emailInput, 'email');
                bindField(usernameInput, 'username');
                bindField(passwordInput, 'password');
                bindField(confirmInput, 'confirm');

                // Re-validate confirm when password changes
                if (passwordInput && confirmInput) {
                    passwordInput.addEventListener('input', function() {
                        if (touched.confirm) validate();
                    });
                }

                validate();

                // Submit spinner
                var form = document.getElementById('kc-register-form');
                form.addEventListener('submit', function() {
                    submitBtn.classList.add('hss-btn-loading');
                });
            })();
        </script>
    </#if>

</@layout.registrationLayout>
