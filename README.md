# Harcerski-System-Stopni
<p align="center">
  <img src="./docs/assets/Logo.png" alt="Logo HSS" width="250"/>
</p>

<p align="center"><b>System wspierający działanie Komisji Stopni Instruktorskich</b><br />
Cyfrowa platforma do zarządzania próbami harcerskimi, dokumentacją i organizacji posiedzeń komisji.</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-%E2%9D%A4-red?logo=nestjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react&logoColor=white"/>
  <img src="https://img.shields.io/badge/Database-MySQL-blue?logo=mysql&logoColor=white"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Auth-JWT-orange?logo=jsonwebtokens&logoColor=white"/>
  <img src="https://img.shields.io/badge/Status-WIP-yellow"/>
  <img src="https://img.shields.io/badge/License-CC%20BY--NC--Custom-blue.svg"/>
</p>

---

## 📋 Spis treści

- [Opis](#opis)
- [Funkcjonalności](#funkcjonalności)
- [Technologie](#technologie)
- [Struktura katalogów](#struktura-katalogów)
- [Uruchomienie lokalne](#uruchomienie-lokalne)
- [Licencja](#licencja)
- [Autor](#autor)

---

## 📖 Opis

Aplikacja webowa, której celem jest wsparcie członków komisji instruktorskiej w ich pracy. Umożliwia zgłaszanie prób przez harcerzy, zatwierdzanie ich przez uprawnione osoby, zarządzanie kalendarzem spotkań oraz archiwizowanie dokumentacji.

> W przyszłości planowana jest implementacja OCR, systemu powiadomień.

---

## ✨ Funkcjonalności

- Rejestracja i logowanie użytkowników z przypisaną rolą (JWT)
- Przesyłanie prób przez użytkowników
- Panel komisji/kapituły do zatwierdzania prób
- Kalendarz z zapisami na posiedzenie komisję
- Archiwum dokumentów komisji
- (W planie) system powiadomień

---

## 🛠 Technologie

| Typ              | Technologia      |
|------------------|------------------|
| Backend          | NestJS (TypeScript) |
| Baza danych      | MySQL (TypeORM)  |
| Autoryzacja      | JWT              |
| Frontend         | React (w planach) |
| OCR / PDF        | Rozważane        |

---

## 📁 Struktura katalogów

```
hss/
├── server/        # Backend (NestJS, zawiera package.json)
├── docs/           # Dokumentacja (roadmap, wymagania)
├── README.md       # Główna dokumentacja projektu
└── .env.example    # Zmienne środowiskowe
```

## 🚀 Uruchomienie lokalne

```bash
# 1. Klonowanie repozytorium
git clone https://github.com/Nikovsky/Harcerski-System-Stopni.git
cd Harcerski-System-Stopni/server

# 2. Instalacja zależności (w katalogu server)
npm install

# 3. Utwórz plik konfiguracyjny
cp .env.example .env

# 4. Start serwera developerskiego
npm run start:dev
```

## 📄 Licencja
Ten projekt jest objęty licencją CC BY-NC 4.0). Zobacz [LICENSE](/LICENSE.md) po więcej informacji.

## 👤 Autor
Projekt tworzony przez **Nikovsky**, jako część portfolio i narzędzie wspierające lokalną społeczność harcerską.
