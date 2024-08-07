# AWSLambda-UpdateDailyPrices
Lambda function which makes a daily call to an API service and populates stock ticker price info for that date into a DynamoDB on AWS. Deletes the oldest data when new data is found.
