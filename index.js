import axios from 'axios'
import { config } from 'dotenv'
import express from 'express'
import { GoogleSpreadsheet } from 'google-spreadsheet'

config()
const app = express()

//Получаем доступ к переменным среды окружения, создаем экземпляр приложения 
// Express и определяем пути к шуткам и телеграмму:
const JOKE_API = 'https://v2.jokeapi.dev/joke/Programming?type=single'
const TELEGRAM_URI = 'https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}/sendMessage'

// Подключаем посредников (middleware) Express и инициализируем таблицу
app.use(express.json())
app.use(
    express.urlencoded({
        extended: true
    })
)

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID)
await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
})

// Определяем роут для POST-запроса к /new-message:

app.post('/new-message', async (req, res) => {
    // Извлекаем сообщение из тела запроса и проверяем, 
    // что сообщение содержит текст и идентификатор чата:

    const { message } = req.body

    const messageText = message?.text?.toLowerCase()?.trim()
    const chatId = message?.chat?.id
    if (!messageText || !chatId) {
        return res.sendStatus(400)
    }
})


// Получаем данные из таблицы и формируем данные для ответа:

await doc.loadInfo()
const sheet = doc.sheetsByIndex[0]
const rows = await sheet.getRows()
const dataFromSpreadsheet = rows.reduce((obj, row) => {
    if (row.date) {
        const todo = { text: row.text, done: row.done }
        obj[row.date] = obj[row.date] ? [...obj[row.date], todo] : [todo]
    }
    return obj
}, {})

// Формируем текст ответа:
let responseText = 'Я не знаю как на это ответить'
if (messageText === 'Шутка') {
    try {
        const response = await axios(JOKE_API)
        responseText = response.data.joke
    } catch (e) {
        console.log(e)
        res.send(e)
    }
} else if (/\d\d\.\d\d/.test(messageText)) {
    responseText =
        dataFromSpreadsheet[messageText] || 'Ты на сегодня всё выполнил, молодец)'
}
try {
    await axios.post(TELEGRAM_URI, {
        chat_id: chatId,
        text: responseText
    })
    res.send('Done')
} catch (e) {
    console.log(e)
    res.send(e)
}

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})