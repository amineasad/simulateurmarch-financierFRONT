# simulateurmarch-financierFRONT

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.16.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## Variables d'environnement Front

Configurer `src/environments/environment.ts` selon votre backend:

- API_BASE: base HTTP du backend (ex: `http://localhost:9090`)
- WS_BASE: base WebSocket/SockJS du backend (ex: `http://localhost:9090`)
- DEFAULT_ASSET_ID: identifiant d'actif par défaut pour les topics (`/topic/orderbook/{assetId}`, `/topic/marketstate/{assetId}`)

Endpoints consommés:

- GET `${API_BASE}/api/orders/orderbook/{assetId}`: snapshot carnet d'ordres
- WS `${WS_BASE}/ws` + topic `/topic/orderbook/{assetId}`: mises à jour carnet
- GET `${API_BASE}/api/portfolio`: snapshot du portefeuille courant
- WS topic `/topic/transactions/{userId}`: rafraîchit le portefeuille à chaque trade
- WS topic `/topic/marketstate/{assetId}`: état marché (OPEN/HALTED)
- Intercepteur HTTP ajoute `Authorization: Bearer <token>` si présent

Auth basique:

- POST `${API_BASE}/api/auth/login` → `{ token, user }` (ou `{ token }`/`{ user }`)
- Token stocké dans `localStorage.authToken`, utilisateur dans `localStorage.currentUser`
