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
import Mailing from "./Models/Mailing.js";
import User from "./Models/User.js";

let status = [
    {
        chatId: process.env.CLIENT_ID,
        place: 1,
        title: "",
        button: "",
        editingButton: "",
        editingButtonText: "",
        editingCategoryTitle: "",
        editingCategoryText: "",
    },
    {
        chatId: process.env.DEVELOP_ID,
        place: 1,
        title: "",
        button: "",
        editingButton: "",
        editingButtonText: "",
        editingCategoryTitle: "",
        editingCategoryText: "",
    },
];

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.setMyCommands([
    {
        command: "/menu",
        description: "Открыть меню",
    },
    {
        command: "/stata",
        description: "Статистика",
    },
]);

bot.on("polling_error", console.log);

bot.on("message", async (message) => {
    const chatId = message.chat.id;
    const index = status.findIndex((el) => el.chatId == chatId);

    if (chatId != process.env.CLIENT_ID && chatId != process.env.DEVELOP_ID) return bot.sendMessage(chatId, "⛔Доступ запрещён");
    else {
        if (message.text.includes("/stata")) {
            bot.deleteMessage(chatId, message.message_id);

            let users = await User.find().sort({ createdAt: -1 });
            let result = "Всего " + users.length + " подписчиков\n\nПользователь - Подписался\n";

            for (let i = 0; i < users.length; i++) {
                result += `@${users[i].username} - ${getDate(users[i].createdAt)}\n`;
                if (i % 50 == 0 && i != 0) {
                    bot.sendMessage(chatId, result);
                    result = ''
                }
            }

            bot.sendMessage(chatId, result);

            return;
        } else if (status[index].place == 1 || message.text == "/menu") {
            status[index].place == 1;
            bot.sendMessage(chatId, "Что менять?", {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Меню обязательных подписок",
                                callback_data: "editSubMenu",
                            },
                        ],
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
                        [
                            {
                                text: "Создать рассылку",
                                callback_data: "newMessage",
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
            let lastCategory = await Category.find();

            let newCategory = new Category({
                title: status[index].title,
                callback: message.text,
                order: lastCategory.length + 1,
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
        } else if (status[index].place == 6) {
            let button = await Button.findOne({ _id: status[index].editingButton });

            button.text = message.text;

            await button.save();

            bot.sendMessage(chatId, "✅Название кнопки успешно изменено");

            status[index].place = 1;
        } else if (status[index].place == 7) {
            let button = await Button.findOne({ _id: status[index].editingButtonText });

            button.url = message.text;

            await button.save();

            bot.sendMessage(chatId, "✅Текст кнопки успешно изменен");

            status[index].place = 1;
        } else if (status[index].place == 8) {
            let category = await Category.findOne({ _id: status[index].editingCategoryTitle });

            category.title = message.text;

            await category.save();

            bot.sendMessage(chatId, "✅Название категории успешно изменено");

            status[index].place = 1;
        } else if (status[index].place == 9) {
            let category = await Category.findOne({ _id: status[index].editingCategoryText });

            category.callback = message.text;

            await category.save();

            bot.sendMessage(chatId, "✅Текст категории успешно изменен");

            status[index].place = 1;
        } else if (status[index].place == 10) {
            let newGroup = new Group({
                group: message.text.slice(13),
            });

            await newGroup.save();

            bot.sendMessage(chatId, "✅Кнопка подписки успешно добавлена");

            status[index].place = 1;
        } else if (status[index].place == 11) {
            let newMailing = new Mailing({
                text: message.text,
                status: "not processed",
            });

            newMailing.save();

            bot.sendMessage(chatId, "✅Рассылка успешно отправлена");

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
                            text: "✒️Изменить название категории",
                            callback_data: "editCategoryTitle",
                        },
                    ],
                    [
                        {
                            text: "✒️Изменить текст категории",
                            callback_data: "editingCategoryText",
                        },
                    ],
                    [
                        {
                            text: "🔁Поменять кнопки местами",
                            callback_data: "replaceCategory",
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
                            text: "✒️Изменить название кнопки",
                            callback_data: "editMenuTitle",
                        },
                    ],
                    [
                        {
                            text: "✒️Изменить текст кнопки",
                            callback_data: "editMenuText",
                        },
                    ],
                    [
                        {
                            text: "🔁Поменять кнопки местами",
                            callback_data: "replaceButton",
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

        bot.editMessageReplyMarkup({ inline_keyboard: buttons }, mess);
    } else if (method == "editMenuTitle") {
        let id = message.data.split(" ")[1];

        if (id) {
            status[index].editingButton = id;
            status[index].place = 6;

            bot.sendMessage(chatId, "Введи новое название кнопки");
        } else {
            let buttons = await Button.find();

            buttons = buttons.map((el) => [{ text: el.text, callback_data: "editMenuTitle " + el._id }]);
            bot.editMessageReplyMarkup({ inline_keyboard: buttons }, mess);
        }
    } else if (method == "editMenuText") {
        let id = message.data.split(" ")[1];

        if (id) {
            status[index].editingButtonText = id;
            status[index].place = 7;

            let button = await Button.findOne({ _id: id });

            bot.sendMessage(chatId, "Текущий текст: \n\n" + button.url + "\n\nВведи новый текст кнопки");
        } else {
            let buttons = await Button.find();

            buttons = buttons.map((el) => [{ text: el.text, callback_data: "editMenuText " + el._id }]);
            bot.editMessageReplyMarkup({ inline_keyboard: buttons }, mess);
        }
    } else if (method == "editCategoryTitle") {
        let id = message.data.split(" ")[1];

        if (id) {
            status[index].editingCategoryTitle = id;
            status[index].place = 8;

            bot.sendMessage(chatId, "Введи новое название категории");
        } else {
            let categories = await Category.find();

            categories = categories.map((el) => [{ text: el.title, callback_data: "editCategoryTitle " + el._id }]);
            bot.editMessageReplyMarkup({ inline_keyboard: categories }, mess);
        }
    } else if (method == "editingCategoryText") {
        let id = message.data.split(" ")[1];

        if (id) {
            status[index].editingCategoryText = id;
            status[index].place = 9;

            let category = await Category.findOne({ _id: id });

            bot.sendMessage(chatId, "Текущий текст: \n\n" + category.callback + "\n\nВведи новый текст категории");
        } else {
            let categories = await Category.find();

            categories = categories.map((el) => [{ text: el.title, callback_data: "editingCategoryText " + el._id }]);
            bot.editMessageReplyMarkup({ inline_keyboard: categories }, mess);
        }
    } else if (method == "editSubMenu") {
        bot.editMessageReplyMarkup(
            {
                inline_keyboard: [
                    [
                        {
                            text: "➕Добавить кнопку подписки",
                            callback_data: "addSubButton",
                        },
                    ],
                    [
                        {
                            text: "➖Удалить кнопку подписки",
                            callback_data: "deleteSubButton",
                        },
                    ],
                ],
            },
            mess
        );
    } else if (method == "addSubButton") {
        bot.editMessageReplyMarkup({ inline_keyboard: [] }, mess);
        bot.editMessageText(
            "Вставь ссылку на канал для новой кнопки\n\n<b>Внимание!</b> Ссылка должна выглядеть так: \nhttps://t.me/<i>тут ссылка</i>",
            { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }
        );

        status[index].place = 10;
    } else if (method == "deleteSubButton") {
        let id = message.data.split(" ")[1];

        if (id) {
            await Group.deleteOne({ _id: id });
            bot.sendMessage(chatId, "✅Кнопка подписки успешно удалена из меню!");
        }

        bot.editMessageText("🗑️Выбери кнопку, которую хочешь удалить", mess);

        let buttons = await Group.find();
        buttons = buttons.map((el) => [{ text: el.group, callback_data: "deleteSubButton " + el._id }]);

        bot.editMessageReplyMarkup({ inline_keyboard: buttons }, mess);
    } else if (method == "replaceButton") {
        let firstId = message.data.split(" ")[1];
        let secondId = message.data.split(" ")[2];

        if (secondId) {
            let firstButton = await Button.findOne({ _id: firstId });
            let secondButton = await Button.findOne({ _id: secondId });
            let temp = 0;

            temp = secondButton.order;
            secondButton.order = firstButton.order;
            firstButton.order = temp;

            await firstButton.save();
            await secondButton.save();

            bot.sendMessage(chatId, "✅Кнопки успешно изменены местами");
        } else if (firstId) {
            bot.editMessageText("Теперь выбери вторую кнопку для замены", mess);

            let buttons = await Button.find().sort({ order: 1 });
            buttons = buttons.map((el) => [{ text: el.text, callback_data: message.data + " " + el._id }]);

            bot.editMessageReplyMarkup({ inline_keyboard: buttons }, mess);
        } else {
            bot.editMessageText("Выбери первую кнопку для замены", mess);

            let buttons = await Button.find().sort({ order: 1 });
            buttons = buttons.map((el) => [{ text: el.text, callback_data: "replaceButton " + el._id }]);

            bot.editMessageReplyMarkup({ inline_keyboard: buttons }, mess);
        }
    } else if (method == "replaceCategory" || method == "rC") {
        let firstId = message.data.split(" ")[1];
        let secondId = message.data.split(" ")[2];

        if (secondId) {
            let firstButton = await Category.findOne({ _id: firstId });
            let secondButton = await Category.findOne({ _id: secondId });
            let temp = 0;

            temp = secondButton.order;
            secondButton.order = firstButton.order;
            firstButton.order = temp;

            await firstButton.save();
            await secondButton.save();

            let buttons = await Category.find().sort({ order: 1 });
            buttons = buttons.map((el) => [{ text: el.title, callback_data: "rC " + el._id }]);

            bot.editMessageReplyMarkup({ inline_keyboard: buttons }, mess);

            bot.sendMessage(chatId, "✅Категории успешно изменены местами");
        } else if (firstId) {
            bot.editMessageText("Теперь выбери вторую категорию для замены", mess);

            let buttons = await Category.find().sort({ order: 1 });
            buttons = buttons.map((el) => [{ text: el.title, callback_data: message.data + " " + el._id }]);

            bot.editMessageReplyMarkup({ inline_keyboard: buttons }, mess);
        } else {
            bot.editMessageText("Выбери первую категорию для замены", mess);

            let buttons = await Category.find().sort({ order: 1 });

            buttons = buttons.map((el) => [{ text: el.title, callback_data: "rC " + el._id }]);

            bot.editMessageReplyMarkup({ inline_keyboard: buttons }, mess);
        }
    } else if (method == "newMessage") {
        bot.editMessageText("Введи текст для рассылки всем участникам", mess);
        status[index].place = 11;
    }
});

import dayjs from "dayjs";

function getDate(date) {
    return dayjs(date).format("DD.MM.YYYY");
}
