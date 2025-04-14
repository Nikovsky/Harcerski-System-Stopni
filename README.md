# Harcerski-System-Stopni

**System wspierający działanie Komisji Stopni Instruktorskich**  
Cyfrowa platforma do zarządzania próbami harcerskimi, dokumentacją i organizacji posiedzeń komisji.

---
![NestJS](https://img.shields.io/badge/NestJS-%E2%9D%A4-red?logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react&logoColor=white)
![MySQL](https://img.shields.io/badge/Database-MySQL-blue?logo=mysql&logoColor=white)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-orange?logo=jsonwebtokens&logoColor=white)
![Status](https://img.shields.io/badge/Status-WIP-yellow)
![License](https://img.shields.io/badge/License-CC%20BY--NC--Custom-blue.svg)

## 📋 Spis treści

- [Opis](#opis)
- [Funkcjonalności](#funkcjonalności)
- [Technologie](#technologie)
- [Struktura katalogów](#struktura-katalogów)
- [Plany rozwoju](#plany-rozwoju)
- [Uruchomienie lokalne](#uruchomienie-lokalne)
- [Licencja](#licencja)
- [Autor](#autor)

---

## 📖 Opis

Aplikacja webowa, której celem jest wsparcie członków komisji instruktorskiej w ich pracy. Umożliwia zgłaszanie prób przez harcerzy, zatwierdzanie ich przez uprawnione osoby, zarządzanie kalendarzem spotkań oraz archiwizowanie dokumentacji.

> W przyszłości planowana jest implementacja OCR, systemu powiadomień oraz głosowań online.

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
├── server/        # Backend (NestJS)
├── client/       # Frontend (React, w planach)
├── docs/           # Dokumentacja (roadmap, wymagania)
├── README.md       # Główna dokumentacja projektu
└── .env.example    # Zmienne środowiskowe
```

## 🗺️ Plany rozwoju

Zobacz [docs/roadmap.md](dosc/roadmap.md) po więcej informacji o planowanych funkcjonalnościach i etapach rozwoju projektu.

## 🚀 Uruchomienie lokalne

```bash
# 1. Klonowanie repozytorium
git clone https://github.com/twoj-nick/ski-sks-app.git
cd ski-sks-app/backend

# 2. Instalacja zależności
npm install

# 3. Utwórz plik konfiguracyjny
cp .env.example .env

# 4. Start serwera developerskiego
npm run start:dev
```

## 📄 Licencja
Ten projekt jest objęty licencją CC BY-NC 4.0). Zobacz [LICENSE](/License.md) po więcej informacji.

## 👤 Autor
Projekt tworzony przez **Nikovsky**, jako część portfolio i narzędzie wspierające lokalną społeczność harcerską.