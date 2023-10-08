import { config } from "dotenv";
config();

import TelegramBot from "node-telegram-bot-api";

import mongoose from "mongoose";
import chalk from "chalk";

mongoose
    .connect(`mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster.dvfjqpc.mongodb.net/darkcore`)
    .then((res) => console.log(chalk.bgGreen.bold("Connected to DB")))
    .catch((error) => console.log(error));

import Group from "./Models/Group.js";
import Button from "./Models/Button.js";
import Category from "./Models/Category.js";

let status = [
    {
        chatId: "5614481899",
        place: 1,
        title: "",
    },
    {
        chatId: "2128372313",
        place: 1,
        title: "",
    },
];

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.setMyCommands([
    {
        command: "/menu",
        description: "Открыть меню",
    },
]);

bot.on("polling_error", console.log);

bot.on("message", async (message) => {
    const chatId = message.chat.id;
    const index = status.findIndex((el) => el.chatId == chatId);
    console.log(message);

    if (chatId != "5614481899" && chatId != "2128372313") return bot.sendMessage(chatId, "⛔Доступ запрещён");
    else {
        if (status[index].place == 1) {
            bot.sendMessage(chatId, "Что менять?", {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Категории",
                                callback_data: "editCategory",
                            },
                        ],
                    ],
                },
            });
        } else if (status[index].place == 2) {
            status[index].title = message.text;

            bot.sendMessage(chatId, "Теперь введи текст, который должен отправляться при нажатии на категорию");

            status[index].place = 3;
        } else if (status[index].place == 3) {
            let newCategory = new Category({
                title: status[index].title,
                callback: message.text,
            });

            await newCategory.save();

            bot.sendMessage(chatId, "✅Категория успешно добавлена");

            status[index].place = 1;
        }
    }
});

bot.on("callback_query", async (message) => {
    const method = message.data.split(" ")[0];
    const chatId = message.message.chat.id;
    const messageId = message.message.message_id;
    const index = status.findIndex((el) => el.chatId == chatId);
    const mess = { chat_id: chatId, message_id: messageId };

    if (method == "editCategory") {
        bot.editMessageReplyMarkup(
            {
                inline_keyboard: [
                    [
                        {
                            text: "➕Добавить категорию",
                            callback_data: "addCategory",
                        },
                    ],
                    [
                        {
                            text: "➖Удалить категорию",
                            callback_data: "deleteCategory",
                        },
                    ],
                ],
            },
            mess
        );
    } else if (method == "addCategory") {
        bot.editMessageReplyMarkup({ inline_keyboard: [] }, mess);
        bot.editMessageText("Введи название новой категории", mess);

        status[index].place = 2;
    } else if (method == "deleteCategory") {
        bot.editMessageReplyMarkup({ inline_keyboard: [] }, mess);
        bot.editMessageText("Введи название новой категории", mess);
    }
});
