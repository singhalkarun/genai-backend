const { Configuration, OpenAIApi } = require("openai");
const { config } = require("dotenv");
const axios = require("axios");

config();

exports.handler = async (event, context) => {
  const data = JSON.parse(event.body);

  let messages = [];

  if (data?.conversation_id) {
    const previousConversations = await axios.get(
      `${process.env.HASURA_BASE_URL}/api/rest/get-conversations/${data?.conversation_id}`,
      {
        headers: {
          "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET,
        },
      }
    );

    previousConversations.data.conversations.forEach((conv) => {
      if (conv.question != null) {
        messages.push({ role: "user", content: conv.question });
      }

      if (conv.answer != null) {
        messages.push({ role: "assistant", content: conv.answer });
      }
    });
  }

  messages.push({ role: "user", content: data?.question });

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const openai = new OpenAIApi(configuration);

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: messages,
    temperature: 0.1,
  });

  if (data?.id) {
    await axios.patch(
      `${process.env.HASURA_BASE_URL}/api/rest/update-conversation/${data?.id}`,
      {
        answer: completion.data.choices[0].message.content,
      },
      {
        headers: {
          "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET,
        },
      }
    );
  }

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
      answer: completion.data.choices[0].message.content,
    }),
  };
};
