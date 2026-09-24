const startCall = document.getElementById("startCall");
const endCall = document.getElementById("endCall");
const statusText = document.getElementById("status");
const conversation = document.getElementById("conversation");
const callCard = document.getElementById("callCard");

let recognition = null;
let callActive = false;
let currentlySpeaking = false;

/*
    TEMPORARY TEST CONFIGURATION

    We will connect your real Luna API endpoint
    and secure the API key after the interface works.

    DO NOT put your permanent private API key here.
*/

const LUNA_API_URL = "/api/chat";
const LUNA_API_KEY = "";


/* -----------------------------
   STATUS
----------------------------- */

function setStatus(text) {
    statusText.textContent = text;
}


/* -----------------------------
   SPEECH RECOGNITION
----------------------------- */

function createRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        setStatus(
            "Speech recognition isn't supported in this browser."
        );

        return null;
    }

    const recognizer = new SpeechRecognition();

    recognizer.lang = "en-US";

    recognizer.continuous = false;

    recognizer.interimResults = false;

    recognizer.maxAlternatives = 1;


    recognizer.onstart = () => {

        if (!callActive) return;

        setStatus("Listening...");
    };


    recognizer.onresult = async (event) => {

        if (!callActive) return;

        const transcript =
            event.results[0][0].transcript.trim();

        if (!transcript) {

            setStatus("Listening...");

            return;
        }

        conversation.textContent = transcript;

        await askLuna(transcript);
    };


    recognizer.onerror = (event) => {

        console.log(
            "Speech recognition:",
            event.error
        );

        if (!callActive) return;

        /*
            Don't immediately tell the user
            "Luna couldn't hear you."

            Some browsers fire recognition errors
            even when the user hasn't spoken yet.
        */

        if (
            event.error === "no-speech" ||
            event.error === "aborted"
        ) {
            setTimeout(() => {

                if (callActive && !currentlySpeaking) {
                    startListening();
                }

            }, 300);

            return;
        }

        setStatus("Microphone error");

    };


    recognizer.onend = () => {

        if (!callActive) return;

        if (currentlySpeaking) return;

        setTimeout(() => {

            if (callActive) {
                startListening();
            }

        }, 250);
    };


    return recognizer;
}


/* -----------------------------
   START LISTENING
----------------------------- */

function startListening() {

    if (!callActive) return;

    if (!recognition) {
        recognition = createRecognition();
    }

    if (!recognition) return;

    try {
        recognition.start();
    } catch (error) {

        /*
            Browsers throw an error if
            recognition is already running.
        */

        console.log(
            "Recognition already running."
        );
    }
}


/* -----------------------------
   ASK LUNA
----------------------------- */

async function askLuna(message) {

    if (!callActive) return;

    setStatus("Luna is thinking...");

    try {

        const response = await fetch(
            LUNA_API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",

                    ...(LUNA_API_KEY
                        ? {
                            "Authorization":
                                `Bearer ${LUNA_API_KEY}`
                        }
                        : {})
                },

                body: JSON.stringify({
                    message: message
                })
            }
        );


        if (!response.ok) {

            throw new Error(
                `API returned ${response.status}`
            );
        }


        const data = await response.json();


        /*
            We'll adjust this once we connect
            your actual Luna API response format.
        */

        const reply =
            data.response ||
            data.reply ||
            data.message ||
            data.text;


        if (!reply) {

            throw new Error(
                "Luna API returned no response text."
            );
        }


        conversation.textContent = reply;

        await speakLuna(reply);

    } catch (error) {

        console.error(
            "Luna API error:",
            error
        );

        setStatus(
            "Luna couldn't connect right now."
        );
    }
}


/* -----------------------------
   TEXT TO SPEECH
----------------------------- */

function speakLuna(text) {

    return new Promise((resolve) => {

        if (!("speechSynthesis" in window)) {

            setStatus(
                "Voice playback isn't supported."
            );

            resolve();

            return;
        }


        currentlySpeaking = true;


        /*
            Stop anything already speaking.
        */

        speechSynthesis.cancel();


        const utterance =
            new SpeechSynthesisUtterance(text);


        utterance.lang = "en-US";

        utterance.rate = 1;

        utterance.pitch = 1;


        utterance.onstart = () => {

            if (!callActive) return;

            setStatus("Luna is speaking...");

            callCard.classList.add("active");
        };


        utterance.onend = () => {

            currentlySpeaking = false;

            callCard.classList.remove("active");


            if (callActive) {

                setStatus("Listening...");

                setTimeout(() => {

                    startListening();

                }, 300);

            }

            resolve();
        };


        utterance.onerror = () => {

            currentlySpeaking = false;

            callCard.classList.remove("active");

            resolve();
        };


        speechSynthesis.speak(utterance);

    });
}


/* -----------------------------
   START CALL
----------------------------- */

startCall.addEventListener(
    "click",
    async () => {

        if (callActive) return;


        callActive = true;

        callCard.classList.add("active");

        startCall.disabled = true;

        setStatus("Starting call...");


        /*
            Ask the browser for microphone permission.
        */

        try {

            const stream =
                await navigator.mediaDevices
                    .getUserMedia({
                        audio: true
                    });


            /*
                We don't actually need to keep
                the MediaStream ourselves because
                SpeechRecognition handles the audio.
            */

            stream.getTracks().forEach(
                track => track.stop()
            );


        } catch (error) {

            console.error(
                "Microphone permission:",
                error
            );

            callActive = false;

            callCard.classList.remove("active");

            startCall.disabled = false;

            setStatus(
                "Microphone permission is required."
            );

            return;
        }


        recognition = createRecognition();

        startListening();
    }
);


/* -----------------------------
   END CALL
----------------------------- */

endCall.addEventListener(
    "click",
    () => {

        callActive = false;

        currentlySpeaking = false;


        if (recognition) {

            try {
                recognition.stop();
            } catch {}
        }


        speechSynthesis.cancel();


        /*
            CHANGE THIS to the URL of
            your main Luna website.
        */

        window.location.href =
            "https://lunadeveloperportal.onrender.com";
    }
);
