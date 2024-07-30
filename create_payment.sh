#!/bin/bash

# QuickPay API key
API_KEY="737eebd1ebea92a4cbb928bb45ec0ea68acceb8c39ef2f82d6841ed7725cfc0a"

# Payment details
ORDER_ID="pm1001"
CURRENCY="dkk"

# Create payment using QuickPay API
curl -u ":$API_KEY" \
     -H "content-type:application/json" \
     -H "Accept-Version:v10" \
     -X POST \
     -d "{\"order_id\":\"$ORDER_ID\",\"currency\":\"$CURRENCY\"}" \
     https://api.quickpay.net/payments
