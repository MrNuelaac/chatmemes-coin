// Import required modules
const { Telegraf } = require('telegraf'); // Telegram bot library
const { MongoClient } = require('mongodb'); // MongoDB client
const dotenv = require('dotenv'); // To load environment variables
dotenv.config(); // Load environment variables from .env file

// Initialize Telegram bot with your API token from the .env file
const bot = new Telegraf(process.env.TELEGRAM_BOT_API);

// MongoDB connection setup
const client = new MongoClient(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
let db, usersCollection;

async function connectToMongoDB() {
    try {
        // Connect to MongoDB
        await client.connect();
        console.log("Connected to MongoDB");
        db = client.db(); // Use the default database in the URI
        usersCollection = db.collection('users'); // Reference to the 'users' collection
    } catch (error) {
        console.error('MongoDB connection failed:', error);
    }
}

// Call the MongoDB connection function
connectToMongoDB();

// Function to create or update a user's session in MongoDB
async function updateUserSession(userId, username, data) {
    const user = await usersCollection.findOne({ userId }); // Check if user exists
    if (user) {
        // If user exists, update their session
        await usersCollection.updateOne(
            { userId },
            { $set: { ...data } }
        );
        console.log(`Updated session for user ${username} (${userId})`);
    } else {
        // If user doesn't exist, create a new user session
        await usersCollection.insertOne({
            userId,
            username,
            ...data,
            createdAt: new Date(),
        });
        console.log(`Created new session for user ${username} (${userId})`);
    }
}

// Handle /start command
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username;

    // Save or update user session in MongoDB
    await updateUserSession(userId, username, { lastAction: 'started bot' });

    // Send a welcome message
    ctx.reply(`Welcome ${username}! You can now interact with the Chatmemes Coin bot.`);
});

// Handle /claim command (for claiming coins)
bot.command('claim', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username;

    // Simulate claiming coins
    const coinsClaimed = 462.96; // Example coin value

    // Update user session with the claimed amount
    await updateUserSession(userId, username, { coins: coinsClaimed, lastAction: 'claimed coins' });

    // Notify user of their claimed coins
    ctx.reply(`You have successfully claimed ${coinsClaimed} coins!`);
});

// Handle custom commands, for example, checking the user's coin balance
bot.command('balance', async (ctx) => {
    const userId = ctx.from.id;

    // Fetch user session from MongoDB
    const user = await usersCollection.findOne({ userId });

    if (user && user.coins) {
        ctx.reply(`You currently have ${user.coins} coins.`);
    } else {
        ctx.reply("You haven't claimed any coins yet. Use /claim to get started!");
    }
});

// Start the bot
bot.launch();

// Graceful stop on SIGINT (Ctrl+C) or SIGTERM
process.once('SIGINT', () => {
    console.log("Stopping bot...");
    bot.stop('SIGINT');
    client.close(); // Close MongoDB connection
});

process.once('SIGTERM', () => {
    console.log("Stopping bot...");
    bot.stop('SIGTERM');
    client.close(); // Close MongoDB connection
});
