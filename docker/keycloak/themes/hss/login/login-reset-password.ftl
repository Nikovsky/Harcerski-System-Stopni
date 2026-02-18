<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username') displayInfo=false; section>

    <#if section = "header">

    <#elseif section = "form">
        <div class="hss-card">
            <div class="hss-card-header">
                <div class="hss-logo">
                    <img src="${url.resourcesPath}/img/logo.svg" alt="HSS Logo" />
                </div>
                <h1 class="hss-title">${msg("resetPasswordTitle")}</h1>
                <p class="hss-subtitle">${msg("resetPasswordSubtitle")}</p>
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

            <form id="kc-reset-password-form" class="hss-form" action="${url.loginAction}" method="post">

                <div class="hss-form-group">
                    <label for="username" class="hss-label">
                        <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                    </label>
                    <div class="hss-input-wrapper">
                        <span class="material-icons hss-input-icon">mail</span>
                        <input tabindex="1" id="username" name="username" type="text" autofocus autocomplete="username"
                               class="hss-input" placeholder="jan.kowalski@zhr.pl"
                               <#if auth?has_content && auth.showUsername()>value="${auth.attemptedUsername}"</#if> />
                    </div>
                </div>

                <button tabindex="2" class="hss-btn-primary" type="submit">
                    ${msg("doSubmitResetPassword")}
                    <span class="material-icons">arrow_forward</span>
                </button>

            </form>

            <div class="hss-divider">
                <div class="hss-divider-line"></div>
            </div>

            <div class="hss-card-footer">
                <a tabindex="3" class="hss-back-link" href="${url.loginUrl}">
                    <span class="material-icons">arrow_back</span>
                    ${msg("backToLogin")}
                </a>
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
    </#if>

</@layout.registrationLayout>
