import Papa from "papaparse";

const SPREADSHEET_ID = "1Xc1qUXJ6sXCZQYqHbta58WsPymn89jyOnngnjmuKCY0";

const MASTER_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6Artizks0Ze1NlaZatB_LSsDOdlHXLHlSaAb8ZtFyUR4X6P_fPBkTKeRxgLAT9ozzidjNEh9huPd5/pub?gid=1522488510&single=true&output=csv";

function readCSV(url: string): Promise<any[]> {

    return new Promise((resolve, reject) => {

        Papa.parse(url, {

            download: true,

            header: true,

            skipEmptyLines: true,

            complete: (result) => resolve(result.data),

            error: reject

        });

    });

}

export async function loadPenduduk() {

    const master = await readCSV(MASTER_URL);

    let semuaPenduduk: any[] = [];

    for (const rt of master) {

        const gid = rt.GID;

        const url =
`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;

        const data = await readCSV(url);

        semuaPenduduk.push(...data);

    }

    return semuaPenduduk;

}
// =========================
// PROFIL
// =========================

const PROFIL_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6Artizks0Ze1NlaZatB_LSsDOdlHXLHlSaAb8ZtFyUR4X6P_fPBkTKeRxgLAT9ozzidjNEh9huPd5/pub?gid=811404914&single=true&output=csv";

export async function loadProfil() {
    return await readCSV(PROFIL_URL);
}