# Pack contents presentation update

- [ ] Improve the visual hierarchy of the pack contents section.
- [ ] Rename the displayed zinnia entry to “زينيا قزم F1”.
- [ ] Keep the approximate quantities and disclaimer unchanged.
- [ ] Verify responsive layout and production build.
- [ ] Save and deliver the updated version link.


# Ecom12-inspired alternate landing route
- [x] Add `/ecom12` as an alternate visual route while preserving `/` unchanged.
- [x] Reuse Maisonverre product content, image slider, form controls, order handlers, delivery behavior, Telegram, and Meta Pixel logic; do not copy Ecom12 logic.
- [x] Apply route-scoped responsive styles inspired by Ecom12's announcement strip, centered hero, concise benefits, and clear order card.
- [x] Run `pnpm check`, `pnpm test`, and `pnpm build`; verify route dispatch and homepage preservation.

# White-strawberry bundle prices on `/ecom12`
- [x] Add the 1 / 2 / 3 box price selector at 1990 / 2990 / 3500 DZD on `/ecom12` only.
- [x] Ensure selected bundle price and label are reflected in total, order, lead, notification, and Pixel value.
- [x] Verify the original homepage still shows its existing price and rerun checks/build.


# Dashboard-managed Meta Pixel ID
- [x] Store a validated Pixel ID in the existing admin settings table, preserving the current ID for existing deployments.
- [x] Expose only the public Pixel ID to storefront clients; keep changes admin-authenticated.
- [x] Add an RTL dashboard field, save feedback, and input validation.
- [x] Load PageView and queued events from the currently saved ID; remove the hardcoded ID from static HTML.
- [x] Add regression coverage and run type-check, tests, and production build.
