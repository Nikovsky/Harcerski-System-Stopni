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
                </div>

                <#if recaptchaRequired??>
                    <div class="hss-form-group">
                        <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}"></div>
                    </div>
                </#if>

                <button tabindex="5" class="hss-btn-primary" type="submit">
                    ${msg("doRegister")}
                    <span class="material-icons">arrow_forward</span>
                </button>

            </form>

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
        </script>
    </#if>

</@layout.registrationLayout>
