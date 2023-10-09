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
        button: "",
    },
    {
        chatId: "2128372313",
        place: 1,
        title: "",
        button: "",
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
                                text: "Основное меню",
                                callback_data: "editMenu",
                            },
                        ],
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
        } else if (status[index].place == 4) {
            status[index].button = message.text;

            bot.sendMessage(chatId, "Теперь введи текст, который должен отправляться при нажатии на кнопку меню");

            status[index].place = 5;
        } else if (status[index].place == 5) {
            let buttons = await Button.find().sort({ order: -1 });

            let newButton = new Button({
                order: buttons[0].order + 1,
                text: status[index].button,
                url: message.text,
            });

            await newButton.save();

            bot.sendMessage(chatId, "✅Кнопка успешно добавлена в меню");

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

    console.log(message.data);

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
        let id = message.data.split(" ")[1];

        if (id) {
            await Category.deleteOne({ _id: id });
            bot.sendMessage(chatId, "✅Категория успешно удалена!");
        }

        bot.editMessageText("🗑️Выбери категорию, которую хочешь удалить", mess);

        let categories = await Category.find();
        categories = categories.map((el) => [{ text: el.title, callback_data: "deleteCategory " + el._id }]);
        console.log(categories);

        bot.editMessageReplyMarkup({ inline_keyboard: categories }, mess);
    } else if (method == "editMenu") {
        bot.editMessageReplyMarkup(
            {
                inline_keyboard: [
                    [
                        {
                            text: "➕Добавить кнопку в меню",
                            callback_data: "addButton",
                        },
                    ],
                    [
                        {
                            text: "➖Удалить кнопку из меню",
                            callback_data: "deleteButton",
                        },
                    ],
                ],
            },
            mess
        );
    } else if (method == "addButton") {
        bot.editMessageReplyMarkup({ inline_keyboard: [] }, mess);
        bot.editMessageText("Введи название новой кнопки", mess);

        status[index].place = 4;
    } else if (method == "deleteButton") {
        let id = message.data.split(" ")[1];

        if (id) {
            await Button.deleteOne({ _id: id });
            bot.sendMessage(chatId, "✅Кнопка успешно удалена из меню!");
        }

        bot.editMessageText("🗑️Выбери кнопку, которую хочешь удалить", mess);

        let buttons = await Button.find();
        buttons = buttons.map((el) => [{ text: el.text, callback_data: "deleteButton " + el._id }]);
        console.log(buttons);

        bot.editMessageReplyMarkup({ inline_keyboard: buttons }, mess);
    }
});
