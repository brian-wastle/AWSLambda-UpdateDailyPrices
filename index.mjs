import 'dotenv/config'
import { DynamoDBClient, PutItemCommand, QueryCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import https from 'https';
import { URL } from 'url';

const dynamoDBClient = new DynamoDBClient({ region: 'us-east-1' });
const tickers = [
    "AAPL", "MSFT", "NVDA", "GOOG", "AMZN", "META", "BRKB", "LLY", "AVGO", "TSLA"
];

export const handler = async (event) => {
    try {
        const responseData = await fetchDataFromAPI();
        if (!responseData || responseData.length === 0) {
            return createResponse(200, 'No new data today.');
        }

        for (const stockData of responseData) {
            const ticker = stockData.ticker;
            const todaysData = await insertStockData(stockData);

            if (todaysData) {
                await deleteOldestDate(ticker);
            }
        }

        return createResponse(200, 'Prices updated successfully.');
    } catch (error) {
        console.error('Error:', error);
        return createResponse(500, 'Failed to update prices today.');
    }
};

const fetchDataFromAPI = async () => {
    const apiUrl = process.env.API_LINK;
    const headers = {
        'Appid': '82435e40-9113-4d34-a98c-2ad48019b4f1',
        'Token': 'A74E750B-B100-4775-B0A1-6AB529C2E68F',
        'Content-Type': 'application/json'
    };

    const formattedDate = getCurrentFormattedDate();
    const params = new URLSearchParams({ start: formattedDate }).toString();
    const body = JSON.stringify(tickers);
    const options = {
        method: 'POST',
        headers: headers,
        path: `${apiUrl}?${params}`,
        hostname: new URL(apiUrl).hostname
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data).datalist));
        });

        req.on('error', (error) => reject(error));
        req.write(body);
        req.end();
    });
};

const insertStockData = async (stockData) => {
    let todaysData = false;

    for (const entry of stockData.datarange) {
        const formattedDate = convertToISODate(entry.date.strdate);
        const item = {
            TableName: 'MarketDB',
            Item: {
                date: { S: formattedDate },
                ticker: { S: stockData.ticker },
                price: { N: entry.price.toString() }
            }
        };

        await dynamoDBClient.send(new PutItemCommand(item));
        todaysData = true; // Mark that new data was inserted
    }

    return todaysData;
};

const convertToISODate = (dateString) => {
    const [month, day, year] = dateString.split('/').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toISOString();
};

const getCurrentFormattedDate = () => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


const deleteOldestDate = async (ticker) => {
    const currentDate = new Date();
    const previousYearDate = new Date(currentDate);
    previousYearDate.setFullYear(currentDate.getFullYear() - 1);
    const formattedDateToDelete = previousYearDate.toISOString().split('T')[0]; 

    const queryCommand = new QueryCommand({
        TableName: 'MarketDB',
        KeyConditionExpression: '#dateKey = :date and ticker = :ticker',
        ExpressionAttributeNames: {
            '#dateKey': 'date'
        },
        ExpressionAttributeValues: {
            ':date': { S: formattedDateToDelete }, 
            ':ticker': { S: ticker } 
        }
    });

    const result = await dynamoDBClient.send(queryCommand);

    // Conditional deletion of ticker info for the oldest date
    if (result.Items.length > 0) {
        const oldestItem = result.Items[0];
        const deleteDateData = new DeleteItemCommand({
            TableName: 'MarketDB',
            Key: {
                date: { S: oldestItem.date.S }, 
                ticker: { S: ticker } 
            }
        });
        await dynamoDBClient.send(deleteDateData);
        console.log(`Deleted oldest entry for ticker ${ticker}:`, oldestItem);
    } else {
        console.log(`No entries found for ticker ${ticker} on date ${formattedDateToDelete}`);
    }
};


const createResponse = (statusCode, message) => {
    return {
        statusCode,
        body: JSON.stringify(message)
    };
};
