# [1.16.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.15.1...v1.16.0) (2026-08-11)


### Features

* **asset/ui:** add name/location search to building list ([#96](https://github.com/zaricu22/SmartCity-Frontend/issues/96)) ([fe7deed](https://github.com/zaricu22/SmartCity-Frontend/commit/fe7deedf9cee7a5f6c330e2b5a475fd3f7995587))

## [1.15.1](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.15.0...v1.15.1) (2026-08-07)


### Bug Fixes

* **asset:** register real HTTP interceptor chain in integration specs ([#94](https://github.com/zaricu22/SmartCity-Frontend/issues/94)) ([4d7869b](https://github.com/zaricu22/SmartCity-Frontend/commit/4d7869ba51c9bac9ec4215832cebdf14290694bb))

# [1.15.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.14.1...v1.15.0) (2026-08-06)


### Features

* **asset/db:** thread optimistic-locking version through building writes ([#78](https://github.com/zaricu22/SmartCity-Frontend/issues/78)) ([befadc1](https://github.com/zaricu22/SmartCity-Frontend/commit/befadc1b5adce81f203d8f9e600fed4d5936f8d2))

## [1.14.1](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.14.0...v1.14.1) (2026-08-06)


### Bug Fixes

* **shared:** restore red delete/remove buttons on confirm dialogs ([3415379](https://github.com/zaricu22/SmartCity-Frontend/commit/3415379d0f60b8e1bfc2f518c801d8c5ee217086))

# [1.14.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.13.0...v1.14.0) (2026-07-31)


### Features

* **asset:** add consumption progress ring and pre-fill change-consumption dialog ([#75](https://github.com/zaricu22/SmartCity-Frontend/issues/75)) ([8a8cd33](https://github.com/zaricu22/SmartCity-Frontend/commit/8a8cd33bef86a4ffb7b24ea927534059639f1d9a))

# [1.13.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.12.0...v1.13.0) (2026-07-31)


### Features

* named energy devices, plus fix building-list stuck-loading bug ([#73](https://github.com/zaricu22/SmartCity-Frontend/issues/73)) ([888c06a](https://github.com/zaricu22/SmartCity-Frontend/commit/888c06adf64bc4ace14600d12add23687e24f26b))

# [1.12.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.11.0...v1.12.0) (2026-07-31)


### Features

* delete building / remove device, wired end-to-end with real-time sync ([#71](https://github.com/zaricu22/SmartCity-Frontend/issues/71)) ([9b7c1bf](https://github.com/zaricu22/SmartCity-Frontend/commit/9b7c1bf12cc8cf550e7ccd3339b4f8ec799a5b30))

# [1.11.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.10.1...v1.11.0) (2026-07-31)


### Features

* **asset:** add toast notifications for CRUD actions and live WS updates ([#69](https://github.com/zaricu22/SmartCity-Frontend/issues/69)) ([2838a6e](https://github.com/zaricu22/SmartCity-Frontend/commit/2838a6e16c63b964f878bd9bd4a73f45184e3c0a))

## [1.10.1](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.10.0...v1.10.1) (2026-07-30)


### Bug Fixes

* **build:** polyfill Node's `global` for sockjs-client in the browser ([c282027](https://github.com/zaricu22/SmartCity-Frontend/commit/c2820270d5305346db12a434f7e6616f3e9bc8cc))

# [1.10.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.9.0...v1.10.0) (2026-07-30)


### Features

* **websocket:** surface STOMP auth failures to the user ([#67](https://github.com/zaricu22/SmartCity-Frontend/issues/67)) ([5ebdc0f](https://github.com/zaricu22/SmartCity-Frontend/commit/5ebdc0f584b90472bf396626fa91bee11c39b14d))

# [1.9.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.8.0...v1.9.0) (2026-07-30)


### Features

* **asset:** wire BuildingCreatedEvent end-to-end with real-time list sync ([#65](https://github.com/zaricu22/SmartCity-Frontend/issues/65)) ([e378164](https://github.com/zaricu22/SmartCity-Frontend/commit/e3781646c54f7004ebf82784a4c9cd421e89c9d9))

# [1.8.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.7.0...v1.8.0) (2026-07-30)


### Features

* **websocket:** implement STOMP/SockJS transport for real-time building updates ([#63](https://github.com/zaricu22/SmartCity-Frontend/issues/63)) ([3e61416](https://github.com/zaricu22/SmartCity-Frontend/commit/3e614165f576caefaf1501418565828d87bfae3f))

# [1.7.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.6.2...v1.7.0) (2026-07-30)


### Features

* **asset:** add eligible query param to public building list filtering ([#60](https://github.com/zaricu22/SmartCity-Frontend/issues/60)) ([44a60bd](https://github.com/zaricu22/SmartCity-Frontend/commit/44a60bd43f6da1f22075e135334125a4ca432d00))

## [1.6.2](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.6.1...v1.6.2) (2026-07-29)


### Bug Fixes

* **docs:** update ui screenshots ([bdd6127](https://github.com/zaricu22/SmartCity-Frontend/commit/bdd61279b35f716f9864e6557755f9d68efc3120))

## [1.6.1](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.6.0...v1.6.1) (2026-06-22)


### Bug Fixes

* **auth:** auto-login after registration by consuming LoginResponse from POST /register ([36a3f89](https://github.com/zaricu22/SmartCity-Frontend/commit/36a3f89f3d54e7dff6727f9c56ee4e93726d168e))

# [1.6.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.5.0...v1.6.0) (2026-06-21)


### Features

* **auth:** add registration, Google OAuth2 login, and callback handler ([#45](https://github.com/zaricu22/SmartCity-Frontend/issues/45)) ([c139725](https://github.com/zaricu22/SmartCity-Frontend/commit/c1397253981e44b5b8fb3b716827d807be9c8070)), closes [#token](https://github.com/zaricu22/SmartCity-Frontend/issues/token)

# [1.5.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.4.2...v1.5.0) (2026-06-19)


### Features

* **asset:** implement pageable building list with URL-driven sort and pagination ([#41](https://github.com/zaricu22/SmartCity-Frontend/issues/41)) ([6b5533b](https://github.com/zaricu22/SmartCity-Frontend/commit/6b5533b3b5624317a1b5de0e2de63f6a0dee3593))

## [1.4.2](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.4.1...v1.4.2) (2026-06-19)


### Bug Fixes

* **presentation:** move app-toast and app-confirm-dialog components ([5884fa9](https://github.com/zaricu22/SmartCity-Frontend/commit/5884fa9ae1ef6da54fcb5f15da73a17b14519241))

## [1.4.1](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.4.0...v1.4.1) (2026-06-18)


### Bug Fixes

* **event:** wire missing PRODUCTION_CHANGED event through WebSocket bridge and building-list ([22a67cd](https://github.com/zaricu22/SmartCity-Frontend/commit/22a67cd0b77daf6b46a18af3a04793c789d28dd1))

# [1.4.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.3.0...v1.4.0) (2026-06-18)


### Features

* **security:** complete auth flow — login form, JWT refresh, timeout, logout, role gating ([#39](https://github.com/zaricu22/SmartCity-Frontend/issues/39)) ([00a66ca](https://github.com/zaricu22/SmartCity-Frontend/commit/00a66cabc01e496e0368dd08eab19e1bc157d5c1))

# [1.3.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.2.1...v1.3.0) (2026-06-17)


### Features

* **ui:** redesign presentation layer with design tokens and Lucide icons ([#37](https://github.com/zaricu22/SmartCity-Frontend/issues/37)) ([618cfbf](https://github.com/zaricu22/SmartCity-Frontend/commit/618cfbfd64f11959704c45ff14db08a93b90ab18))

## [1.2.1](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.2.0...v1.2.1) (2026-06-16)


### Bug Fixes

* GitHub Pages deploy path, API contract bugs, and backend health check ([9e4a2fa](https://github.com/zaricu22/SmartCity-Frontend/commit/9e4a2fae7057585336095c55ff3ef588c99ce030))

# [1.2.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.1.0...v1.2.0) (2026-06-15)


### Features

* **mutation:** add Stryker mutation testing with Jest runner ([#31](https://github.com/zaricu22/SmartCity-Frontend/issues/31)) ([2e96a33](https://github.com/zaricu22/SmartCity-Frontend/commit/2e96a33d979e14971cce19c6ef0f4be1187bb75e))

# [1.1.0](https://github.com/zaricu22/SmartCity-Frontend/compare/v1.0.0...v1.1.0) (2026-06-14)


### Features

* **arch:** add DDD architecture tests with dedicated CI job ([#24](https://github.com/zaricu22/SmartCity-Frontend/issues/24)) ([3c9ac86](https://github.com/zaricu22/SmartCity-Frontend/commit/3c9ac863ab9d8708f43ae0039768289cf29c01cf))

# 1.0.0 (2026-05-29)


### Features

* **asset:** application layer ([e2d8086](https://github.com/zaricu22/SmartCity-Frontend/commit/e2d8086d6156b309d89940138168c58c34175274))
* **asset:** domain layer ([f511bbf](https://github.com/zaricu22/SmartCity-Frontend/commit/f511bbf9a55e3e38edf40bea780162eea2364efb))
* **asset:** infrastructure layer ([4f1eaa2](https://github.com/zaricu22/SmartCity-Frontend/commit/4f1eaa2b086f04890da1ab79e89375f6dca110ee))
* **asset:** presentation layer ([671e082](https://github.com/zaricu22/SmartCity-Frontend/commit/671e082d8bf31804e9206caef7c07cc40814d856))
* **ci:** add CI/CD pipeline, ESLint, and fix test/lint issues post-merge ([8d52c79](https://github.com/zaricu22/SmartCity-Frontend/commit/8d52c79c87872d4279f9201e8d2c421d7fdbefea))
* **shared:** infrastructure ([8d93d8f](https://github.com/zaricu22/SmartCity-Frontend/commit/8d93d8f5b1f45d71b222c0f4ad4be19ddb2735cc))
* **shared:** presentation ([5f294fd](https://github.com/zaricu22/SmartCity-Frontend/commit/5f294fd968f4a8470cf8ed675882733b74947aad))

# 1.0.0 (2026-05-29)


### Features

* **asset:** application layer ([e2d8086](https://github.com/zaricu22/SmartCity-Frontend/commit/e2d8086d6156b309d89940138168c58c34175274))
* **asset:** domain layer ([f511bbf](https://github.com/zaricu22/SmartCity-Frontend/commit/f511bbf9a55e3e38edf40bea780162eea2364efb))
* **asset:** infrastructure layer ([4f1eaa2](https://github.com/zaricu22/SmartCity-Frontend/commit/4f1eaa2b086f04890da1ab79e89375f6dca110ee))
* **asset:** presentation layer ([671e082](https://github.com/zaricu22/SmartCity-Frontend/commit/671e082d8bf31804e9206caef7c07cc40814d856))
* **ci:** add CI/CD pipeline, ESLint, and fix test/lint issues post-merge ([7931f39](https://github.com/zaricu22/SmartCity-Frontend/commit/7931f390f200cd7e2adf4f6d0e416082c8d30715))
* **shared:** infrastructure ([8d93d8f](https://github.com/zaricu22/SmartCity-Frontend/commit/8d93d8f5b1f45d71b222c0f4ad4be19ddb2735cc))
* **shared:** presentation ([5f294fd](https://github.com/zaricu22/SmartCity-Frontend/commit/5f294fd968f4a8470cf8ed675882733b74947aad))
