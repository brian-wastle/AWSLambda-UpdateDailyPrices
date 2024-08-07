# AWSLambda-UpdateDailyPrices

## Description
Lambda function which makes a daily call to an API service and populates stock ticker price info for that date into a DynamoDB on AWS. Deletes the oldest data when new data is found.

## Installation

Compress 'node_modules' and 'index.mjs' to a zip file. This can be done through the CLI, and it's easy to do this from the File Explorer on a Windows machine. This zip file can then be uploaded to the Lambda code editor in your AWS console.

## Usage

Built for usage with AWS Lambda, DynamoDB and the FastTrackMarket API service. Requires a paid subscription to implement these services.



