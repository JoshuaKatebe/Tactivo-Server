curl --request POST \
  --url https://api.pawapay.io/v2/deposits \
  --header 'Authorization: Bearer eyJraWQiOiIxIiwiYWxnIjoiRVMyNTYifQ.eyJ0dCI6IkFBVCIsInN1YiI6IjE4MDMiLCJtYXYiOiIxIiwiZXhwIjoyMDgxNDA5MzQyLCJpYXQiOjE3NjU4NzY1NDIsInBtIjoiREFGLFBBRiIsImp0aSI6IjIxMmI5ZDQ1LWE5MmQtNDkxYy1hMmY0LTk2ODIwNGE2M2Y1MCJ9.1fzGYXtmnrBIsDOTU88-dMNUBMu6w-3wilrnBxQlQZeG6HbNXmhzqju3wv4t6dnEKsQhLaX_WHhC8uWAv9WaIA' \
  --header 'Content-Type: application/json' \
  --data '
{
  "depositId": "6d6ecc0c-cad2-4234-9713-04e8734c34da",
  "payer": {
    "type": "MMO",
    "accountDetails": {
      "phoneNumber": "260977487852",
      "provider": "AIRTEL_OAPI_ZMB"
    }
  },
  "amount": "1",
  "currency": "ZMW",
  "preAuthorisationCode": "<string>",
  "clientReferenceId": "EMP001",
  "customerMessage": "payment test",
  "metadata": [
    {
      "orderId": "ORD-123456789"
    },
    {
      "customerId": "customer@email.com",
      "isPII": true
    }
  ]
}
'

RESPONSE
{
  "depositId": "6d6ecc0c-cad2-4234-9713-04e8734c34da",
  "status": "ACCEPTED",
  "created": "2025-12-16T12:04:13Z",
  "nextStep": "FINAL_STATUS"
}

CHECK STATUS

curl --request GET \
  --url https://api.pawapay.io/v2/deposits/{depositId} \
  --header 'Authorization: Bearer eyJraWQiOiIxIiwiYWxnIjoiRVMyNTYifQ.eyJ0dCI6IkFBVCIsInN1YiI6IjE4MDMiLCJtYXYiOiIxIiwiZXhwIjoyMDgxNDA5MzQyLCJpYXQiOjE3NjU4NzY1NDIsInBtIjoiREFGLFBBRiIsImp0aSI6IjIxMmI5ZDQ1LWE5MmQtNDkxYy1hMmY0LTk2ODIwNGE2M2Y1MCJ9.1fzGYXtmnrBIsDOTU88-dMNUBMu6w-3wilrnBxQlQZeG6HbNXmhzqju3wv4t6dnEKsQhLaX_WHhC8uWAv9WaIA'

  response
  {
  "status": "FOUND",
  "data": {
    "depositId": "8917c345-4791-4285-a416-62f24b6982db",
    "status": "COMPLETED",
    "amount": "123.00",
    "currency": "ZMW",
    "country": "ZMB",
    "payer": {
      "type": "MMO",
      "accountDetails": {
        "phoneNUmber": "260763456789",
        "provider": "MTN_MOMO_ZMB"
      }
    },
    "customerMessage": "To ACME company",
    "clientReferenceId": "REF-987654321",
    "created": "2020-10-19T08:17:01Z",
    "providerTransactionId": "12356789",
    "metadata": {
      "orderId": "ORD-123456789",
      "customerId": "customer@email.com"
    }
  }
}

other response
{"data":{"depositId":"6d6ecc0c-cad2-4234-9713-04e8734c34da","status":"FAILED","amount":"1.00","currency":"ZMW","country":"ZMB","payer":{"type":"MMO","accountDetails":{"phoneNumber":"260977487852","provider":"AIRTEL_OAPI_ZMB"}},"customerMessage":"payment test","clientReferenceId":"EMP001","created":"2025-12-16T09:19:38Z","failureReason":{"failureMessage":"The customer did not approve the payment. Either the customer did not enter their PIN in time or incorrect PIN was entered.","failureCode":"PAYMENT_NOT_APPROVED"}},"status":"FOUND"}