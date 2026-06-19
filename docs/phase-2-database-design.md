# Phase 2 — Database Design

Collections

users
addresses
products
product_variants
categories
brands
inventory
cart
cart_items
orders
order_items
payments
transactions
wallets
reviews
coupons
notifications
wishlists
banners
search_history
otp_codes
refresh_tokens

Relationships

User → Orders

User → Cart

Product → Variants

Product → Category

Order → Order Items

Payment → Order

Review → Product

Inventory → Product