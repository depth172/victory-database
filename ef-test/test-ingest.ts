const API_URL = "http://127.0.0.1:54321/functions/v1/ingest-players";
const ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const INGEST_KEY = "NmU1ZjBhOWMtZTAxNi00OTRkLWIyNTctMzQ5MmY0YWEzM2Rk";

const testPlayers = [
    {
        id: "player-001",
        number: 10,
        name: "テスト太郎",
        ruby: "てすとたろう",
        nickname: "テスト",
        appeared_works: "作品A",
        description: "説明文",
        get_methods: [],
        img_url: "https://example.com/img.jpg",
        view_url: "https://example.com",
        position: "FW",
        element: null,
        kick: 80,
        control: 75,
        technique: 85,
        pressure: 70,
        physical: 80,
        agility: 85,
        intelligence: 75,
        age_group: "U-20",
        grade: "high_school",
        gender: "male",
        category: ["forward"],
        affiliation: ["Team A"],
    },
];

async function test() {
    console.log("Testing ingest-players function...\n");

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
								"Authorization": `Bearer ${ANON_KEY}`,
                "x-ingest-key": INGEST_KEY,
            },
            body: JSON.stringify(testPlayers),
        });

        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

test();