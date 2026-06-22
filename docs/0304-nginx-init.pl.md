## CERTYFIKATY POD NGINX
## Certyfikaty TLS pod Nginx (DEV) — mkcert + WSL2 (Ubuntu) + Windows

Poniższa instrukcja tworzy **lokalnie zaufany** certyfikat TLS dla domeny `hss.local` (oraz `localhost`, `127.0.0.1`, `::1`) i pozwala używać HTTPS w środowisku developerskim za Nginx.

---

### 1) Wymagania

* Windows + WSL2 (Ubuntu)
* Docker Desktop
* Dostęp do plików projektu z WSL (np. `/mnt/c/...`)

---

## A) Utworzenie certyfikatów w WSL2 (Ubuntu)

1. Zainstaluj `mkcert` i narzędzia do trust store:

```bash
sudo apt update
sudo apt install -y mkcert libnss3-tools
```

2. Przejdź do katalogu projektu i utwórz folder na certyfikaty (przykład ścieżki — zmień na swoją):

```bash
cd /mnt/c/Users/<TWOJ_USER>/Documents/GitHub/hss
mkdir -p infra/docker/nginx/certs
cd infra/docker/nginx/certs
```

3. Zainstaluj lokalne CA (Certificate Authority) `mkcert` w środowisku:

```bash
mkcert -install
```

4. Wygeneruj certyfikat dla `hss.local` oraz lokalnych adresów:

```bash
mkcert "*.hss.local" "hss.local" "localhost" "127.0.0.1" "::1"
```

W tym folderze powstaną pliki:

* `hss.local+X.pem` *(certyfikat — nazwa może mieć `+1`, `+2` itd.)*
* `hss.local+X-key.pem` *(klucz prywatny)*

5. Skopiuj certyfikat CA (ROOT) do tego folderu — będzie potrzebny do zaufania na Windows:

```bash
cp "$(mkcert -CAROOT)/rootCA.pem" .
```

> **Uwaga:** nie kopiuj i nie commituj `rootCA-key.pem` (to prywatny klucz CA).

---

## B) Dodanie domeny do `hosts` na Windows

1. Otwórz Notatnik jako Administrator
2. Otwórz plik:

```
C:\Windows\System32\drivers\etc\hosts
```

3. Dodaj linię:

```
# HSS (Harcerski System Stopni)
127.0.0.1       hss.local
127.0.0.1       s3.hss.local
127.0.0.1       s3console.hss.local
127.0.0.1       auth.hss.local
127.0.0.1       api.hss.local
```

4. Zapisz plik

---

## C) Instalacja certyfikatu CA na Windows (żeby przeglądarka ufała HTTPS)

1. W folderze:

```
infra/docker/nginx/certs
```

znajdź plik:

* `rootCA.pem`

2. Zmień jego rozszerzenie:

* `rootCA.pem` → `rootCA.crt`

3. Otwórz okno certyfikatów:

* `WIN + R` → wpisz:

```
certmgr.msc
```

4. Przejdź do:

* **Zaufane główne urzędy certyfikacji** → **Certyfikaty**

5. Kliknij prawym:

* **Wszystkie zadania → Importuj...**

6. Wskaż plik `rootCA.crt` i wybierz magazyn:

* **Zaufane główne urzędy certyfikacji**

7. Zakończ import

Po tym kroku Chrome/Edge powinny ufać certyfikatowi.

> **Firefox:** jeśli nadal pokazuje ostrzeżenie, ustaw w `about:config`:
> `security.enterprise_roots.enabled = true`

---

## D) Podpięcie certyfikatów w Nginx (ścieżki)

W konfiguracji Nginx (dev) użyj:

* `ssl_certificate` → plik `hss.local+X.pem`
* `ssl_certificate_key` → plik `hss.local+X-key.pem`

Przykład (dopasuj do ścieżki wewnątrz kontenera):

```nginx
ssl_certificate     /etc/nginx/certs/hss.local+1.pem;
ssl_certificate_key /etc/nginx/certs/hss.local+1-key.pem;
```

---

## E) Usunięcie certyfikatu CA z Windows (opcjonalnie)

1. `WIN + R` → wpisz:

```
certmgr.msc
```

2. **Zaufane główne urzędy certyfikacji** → **Certyfikaty**
3. Znajdź wpis związany z `mkcert`
4. PPM → **Usuń**
