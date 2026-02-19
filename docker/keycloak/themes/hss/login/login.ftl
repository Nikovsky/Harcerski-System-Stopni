<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>

    <#if section = "header">

    <#elseif section = "form">
        <div class="hss-card">
            <div class="hss-card-header">
                <div class="hss-logo">
                    <img src="${url.resourcesPath}/img/logo.svg" alt="HSS Logo" />
                </div>
                <h1 class="hss-title">Zaloguj się do HSS</h1>
                <p class="hss-subtitle">Harcerski System Stopni</p>
            </div>

            <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                <#if message.type = 'success'>
                    <div class="hss-alert hss-alert-success">
                        <span>${kcSanitize(message.summary)?no_esc}</span>
                    </div>
                <#elseif message.type = 'error'>
                    <div class="hss-alert hss-alert-error">
                        <span>${kcSanitize(message.summary)?no_esc}</span>
                    </div>
                <#elseif message.type = 'info'>
                    <div class="hss-alert hss-alert-info">
                        <span>${kcSanitize(message.summary)?no_esc}</span>
                    </div>
                </#if>
            </#if>

            <form id="kc-form-login" class="hss-form" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">

                <div class="hss-form-group">
                    <label for="username" class="hss-label">
                        <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                    </label>
                    <div class="hss-input-wrapper">
                        <span class="material-icons hss-input-icon">person</span>
                        <input tabindex="1" id="username" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="username"
                               class="hss-input" placeholder="jan.kowalski@zhr.pl" />
                    </div>
                </div>

                <div class="hss-form-group">
                    <div class="hss-label-row">
                        <label for="password" class="hss-label">${msg("password")}</label>
                        <#if realm.resetPasswordAllowed>
                            <a tabindex="4" class="hss-link" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
                        </#if>
                    </div>
                    <div class="hss-input-wrapper">
                        <span class="material-icons hss-input-icon">lock</span>
                        <input tabindex="2" id="password" name="password" type="password" autocomplete="current-password"
                               class="hss-input hss-input-password" placeholder="••••••••" />
                        <button type="button" class="hss-password-toggle" onclick="togglePassword('password', this)" tabindex="5" aria-label="Pokaż/ukryj hasło">
                            <span class="material-icons eye-open">visibility_off</span>
                            <span class="material-icons eye-closed" style="display:none">visibility</span>
                        </button>
                    </div>
                </div>

                <#if realm.rememberMe && !usernameHidden??>
                    <div class="hss-form-options">
                        <div class="hss-checkbox-group">
                            <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" <#if login.rememberMe??>checked</#if>>
                            <label for="rememberMe">${msg("rememberMe")}</label>
                        </div>
                    </div>
                </#if>

                <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>

                <button tabindex="4" class="hss-btn-primary" name="login" id="kc-login" type="submit">
                    ${msg("doLogIn")}
                    <span class="material-icons">arrow_forward</span>
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

            <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
                <div class="hss-card-footer">
                    <p>
                        ${msg("noAccount")}
                        <a tabindex="6" class="hss-link-register" href="${url.registrationUrl}">${msg("doRegister")}</a>
                    </p>
                </div>
            </#if>
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
        </script>
    </#if>

</@layout.registrationLayout>
