# Payment link verification

Checked 2026-08-18 during owner test-flow review.

- PayPal URL configured in Checkout: https://www.paypal.com/qrcodes/p2pqrc/C7Q5PY283N5QA
- Observed browser destination: https://www.paypal.com/us/digital-wallet (general PayPal page, not a transaction confirmation page).
- Bit URL configured in Checkout: https://www.bitpay.co.il/app/me/C6CBFC03-787A-2F4E-8878-1A34E17937D86AE4
- Observed browser response: BitPay access denied / Error 16 from its security service.
- Product rule: opening either URL must not prove payment and must not activate a subscription automatically. Manual payment request plus receipt review remains required.
