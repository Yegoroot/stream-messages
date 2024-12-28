**Тестовое задание**

**Используемые технологии**

TypeScript

Node.js ( Можно использовать Express или Fastify )

React

React Query

MongoDB ( Без ORM )

WebSockets ( Можно использовать только https://github.com/websockets/ws
)

**Описание**

Вам необходимо создать приложение для обмена сообщениями между клиентом
и сервером. Не требуется хостинг, только предоставление кода и
инструкция по запуску.

Сервер на Node.js должен иметь следующие http роуты:

> • POST Создать сообщение
>
> • GET Получить все сообщения

Сообщения должны храниться в MongoDB.

При создании сообщения сервер должен накапливать их пачками по 10 штук и
отправлять в MongoDB всю пачку.

Накопление должно происходить по принципу что быстрее произойдет -
накопится 10 сообщений или пройдет таймаут в 1 секунду.

При отключении сервера сообщения не должны быть потеряны.

Сервер должен "слушать" изменения в MongoDB и отправлять отдельное
WebSocket событие о каждом добавленном в БД сообщении.

React-приложение должно использовать библиотеку React Query для
взаимодействия с данными сервера. События WebSocket должны обновлять
данные в React Query. UI должен отображать актуальный список сообщений и
предоставлять инпут для создания новых сообщений.

При запуске клиентское приложение должно получить список сообщений через
GET запрос к серверу, все последующие обновления списка сообщений должны
приходить только через WebSocket.

**Оцениваемые аспекты**

> • Дизайн и структура системы
>
> • Взаимодействие между клиентом и сервером через WebSockets
>
> • Накопление и обновление данных
>
> • Все требования соблюдены и нет багов
>
> • Код продакшн уровня

**Что не будет оцениваться**

> • Стили пользовательского интерфейса ( UI )