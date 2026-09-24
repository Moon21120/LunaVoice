const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

const LUNA_API_URL = process.env.LUNA_API_URL;
const LUNA_API_KEY = process.env.LUNA_API_KEY;


/* -----------------------------
   Middleware
----------------------------- */

app.use(express.json());

app.use(express.static(path.join(__dirname)));


/* -----------------------------
   Luna API proxy
----------------------------- */

app.post("/api/chat", async (req, res) => {

    try {

        const message = req.body?.message;

        if (!message) {

            return res.status(400).json({
                error: "Message is required."
            });
        }


        if (!LUNA_API_URL || !LUNA_API_KEY) {

            console.error(
                "Luna API environment variables are missing."
            );

            return res.status(500).json({
                error: "Luna API is not configured."
            });
        }


        const lunaResponse = await fetch(
            LUNA_API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${LUNA_API_KEY}`
                },

                body: JSON.stringify({
                    message: message
                })
            }
        );


        const text =
            await lunaResponse.text();


        let data;

        try {
            data = JSON.parse(text);
        } catch {
            data = {
                response: text
            };
        }


        if (!lunaResponse.ok) {

            console.error(
                "Luna API error:",
                lunaResponse.status,
                data
            );

            return res.status(
                lunaResponse.status
            ).json(data);
        }


        res.json(data);

    } catch (error) {

        console.error(
            "Voice backend error:",
            error
        );

        res.status(500).json({
            error: "Unable to contact Luna."
        });
    }
});


/* -----------------------------
   Start server
----------------------------- */

app.listen(PORT, () => {

    console.log(
        `Luna Voice running on port ${PORT}`
    );

});
