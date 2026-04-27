
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const links = [
    "https://drive.google.com/open?id=1OkiLvS4Jlfohj7f0F9914lnfSfkedM9p",
    "https://drive.google.com/open?id=1QNbNa7FFOUjU2Wd8fmpAOBJi5XYsPgvJ",
    "https://drive.google.com/open?id=11UWOG_OjzWAZyyoxl3vpu56_DxLkepqU",
    "https://drive.google.com/open?id=1HZi8eI8TO7N6x7ld6Z8x4nIlUs1o3tpQ",
    "https://drive.google.com/open?id=1_wuy7nghjwjf_pJg_IbFWf4fVjfdt_91",
    "https://drive.google.com/open?id=15A_20cdxgXwDCUEWddY6JMvFjxuwL-8c",
    "https://drive.google.com/open?id=1h5X8ksJXZGSqdXO6Gp4y6lD1O-Gux7tQ",
    "https://drive.google.com/open?id=1Mb04K4e0CfYZ5qkdpqQgbE-qsd5IPnVk",
    "https://drive.google.com/open?id=1XqIgPh-dnpmhed1qT59WVCsIvLcmrr6e",
    "https://drive.google.com/open?id=1Z-wlfVEa2QAdzVQ1K_ksdUpFSQePKQ9S",
    "https://drive.google.com/open?id=1wMqUIP3AQxh2mMn_6syfzbp-fHWNqO3e",
    "https://drive.google.com/open?id=1RFj8bTpKmpn35VH4sRhcT-ATwLE3bVwM",
    "https://drive.google.com/open?id=1G8ZP5Vg_3Vn1nRtVSkjxYwjXOLzw-XvU",
    "https://drive.google.com/open?id=1xz8l8aAiIdLDasBThWQ_puHG8ZalDg90",
    "https://drive.google.com/open?id=1kd7aqgo_cGbpfUs4Vwb7Lae5UiKaPVsU",
    "https://drive.google.com/open?id=1FZcxqQe9VF4DCZ0rIb3GGGZo1_NMojCn",
    "https://drive.google.com/open?id=1qbS_Lv1F7JX1xxkQ0tOMpbXV0v1w68VC",
    "https://drive.google.com/open?id=1THAdOVZlonWGlnrM_6rPL6jVi7WBniAk",
    "https://drive.google.com/open?id=1w_HG4r7vLkwIKjVZzzHIRp6FCxTUD6Iz",
    "https://drive.google.com/open?id=1xJh1wJav3yt8-sIJ-eYllP5M_cHmil97",
    "https://drive.google.com/open?id=1fHSoabb6hBQmQTSs_4NzvAhk11uvrBkX",
    "https://drive.google.com/open?id=1ZU6ofJ6e67Lwvt8CKnqCWwMvzUoYKncQ",
    "https://drive.google.com/open?id=1tarxNsTUxXLtSzifWe3P2RUhkpoemAxj",
    "https://drive.google.com/open?id=1q4y8bAH-NXlu7AvswF4P3VYymxVHQ9hq",
    "https://drive.google.com/open?id=1Ya5jGHKBPjxIxRZndLrb-iukOWbvkf21",
    "https://drive.google.com/open?id=1tKE4GiFq3N3odeGjTuU0nrQgOWZUhNgF",
    "https://drive.google.com/open?id=1qq6HGOrZRAJ4_lCdAlEIzH6LUq9tQBsw",
    "https://drive.google.com/open?id=15Fmu2UaqGv2GEXplj91M6FQouARkR8dV",
    "https://drive.google.com/open?id=1KEUL5j1HDT8J-J1MqmQ2jaGKyxlMDW_9",
    "https://drive.google.com/open?id=1uPiwtsCDryHF-LyHaHvXpv0Ebl1ck9a9",
    "https://drive.google.com/open?id=1xM6IylsuIHADmfVftmHYsAmRJfnwuNJo",
    "https://drive.google.com/open?id=1IliKLCntPplMNUCGs_5inAkCufOwXBis",
    "https://drive.google.com/open?id=1oXsN2hX8byp7n9czuCRaDUONILxYdlml",
    "https://drive.google.com/open?id=1gmsr943dcsgm5y1AcAoXOD_vGRRKhVr2",
    "https://drive.google.com/open?id=1lIYXk7__af6HRWzXx3V-mlTYHUJpE4fY",
    "https://drive.google.com/open?id=1rCmKvDqhSqAYLXDhow-QieKTd_1vYE-Z",
    "https://drive.google.com/open?id=1oha877iB_Z6Kmh7uC0jYuzCGzpvfDDp_",
    "https://drive.google.com/open?id=1OpQx43DWRLZsJ3nt9iYOniidr_nUAeL3",
    "https://drive.google.com/open?id=1VM5FV7rWMYhZiG5sNUNIkudqagm3Qedp",
    "https://drive.google.com/open?id=1GUzgDNtq43nkJQYPc_EnUAajansWw9mS",
    "https://drive.google.com/open?id=12cf-oPboTkEcNnQswHtulpiOd5mjp-rU",
    "https://drive.google.com/open?id=1IzcVPqeJFviIj1adOG5Wevv-A3ue3rce",
    "https://drive.google.com/open?id=1lwkmabZu6_tueSkTbD8tqjW_s5pQ-G9j",
    "https://drive.google.com/open?id=18bLJSGnUktHpQCkrhgxNbmdLoVQ3Uw8j",
    "https://drive.google.com/open?id=1c8WbPa5DUn60kOFQDnzYIJ4konRonYBb",
    "https://drive.google.com/open?id=1wKh-TGJG5Xns9AN2mUbfgWQ5VgM4gtpf",
    "https://drive.google.com/open?id=1mNtIyWf4OcJE6mBZYuWI3GJoKu5kjMGs",
    "https://drive.google.com/open?id=1FJRHM-F1DSQPCMUZ_XZVRNYdiUYYwvBd",
    "https://drive.google.com/open?id=1FlbQPrKD9Xnl-s12b_IwYfXbnH-lGITy",
    "https://drive.google.com/open?id=1_yU91jX7qhFoAZotKxFSQp97Df1yWJIq",
    "https://drive.google.com/open?id=11yNE6hP-O3plYkJ51uEnqqAUSDpeIHcR",
    "https://drive.google.com/open?id=1TYkP23mP2XwusI610eDzU-b6UkXdH039",
    "https://drive.google.com/open?id=17wfcNztBCJKH76KkyQ0Y3dTRo_1Yvv9m",
    "https://drive.google.com/open?id=1A7HNo0Udc8GDGRwL75illMjkhUXBlMsT",
    "https://drive.google.com/open?id=1cnkyxl_sy4xwxx6pxtRmcceYGHsRwQYO",
    "https://drive.google.com/open?id=1k8YJ1_VLfStY3VTAr5NXM5150EHDhB_Z",
    "https://drive.google.com/open?id=1L9ibzLVoC4ui05TPVHKSH1xwe2UnTwX3",
    "https://drive.google.com/open?id=1I6NboyUItOOcqiaNDgo44nwQqCkd9e_l",
    "https://drive.google.com/open?id=1uVXzzL_aJAcc9WfNwNvLztoHTX_Ebosd",
    "https://drive.google.com/open?id=1jyqiiV6lELw7wfPVe5Oaq2TliSwwhAGs",
    "https://drive.google.com/open?id=1gdyCA5It2qtpyMD4jF_sGfX63Do8bmKW",
    "https://drive.google.com/open?id=1G1LVh9ENN7UoROGm-zXla9YkYydHpNzh",
    "https://drive.google.com/open?id=1GlFylHZSijsVv7ibX0Qf6armpasr9oDj",
    "https://drive.google.com/open?id=1Rxc7dwMcUB54HLjsbzW7cQIW31nXrnzw",
    "https://drive.google.com/open?id=1f2fpt8pA535h5EDGBTA8Bxu0wmEIOHZy",
    "https://drive.google.com/open?id=1LmnN1URGfJgJ_c0yQ682y2rpfrznGriy",
    "https://drive.google.com/open?id=18BBOqD7rZzqLOtmkrTOWXtQCBVki9Fdy",
    "https://drive.google.com/open?id=1DHfAMFXd9u_F7AHmpMLeOYouHLNNTiMs",
    "https://drive.google.com/open?id=1KY5XUrO8VuIkvflY-yFqLudIxBjhglHS",
    "https://drive.google.com/open?id=196SMTqFc91IW0pxXhWj0fiYGxJYCzF8m",
    "https://drive.google.com/open?id=1fg_SpIlaJ59bH-jH91nT_pTjGfshuXop",
    "https://drive.google.com/open?id=1YFZ3IjUZjiBFYkgKyuADHVseSOQ7w0EF",
    "https://drive.google.com/open?id=1BwOD8G8DNRIFEOu97mBqdMtohyT8tNl5",
    "https://drive.google.com/open?id=1OfYcPn5UnlwBZ15GNGCyToVCv4xhaEUb",
    "https://drive.google.com/open?id=154AjtnTpPp8Xy7gqClutmEA5ByV3UELe",
    "https://drive.google.com/open?id=1-RIJyRowZR_Wvh7tmg6A7p4kI8bspqrJ",
    "https://drive.google.com/open?id=1udXRUHpa_pPPusFaF8zHpJTrcv_1iFF5",
    "https://drive.google.com/open?id=1zSaSxFPK2OVx8XlXc3Exw2LhNizdk5r3",
    "https://drive.google.com/open?id=1DhqmwTVl1pRgkz2fUBVassqi7TfCy2Ko",
    "https://drive.google.com/open?id=1YnIPCyHnYkSsqhihaeEC_tqXPm5YNxfE",
    "https://drive.google.com/open?id=1cC2KxNIKN0cNywfqKnmHvWVuyOI-F4k9"
  ];

  console.log("Asignando links reales a productos...");
  for (let i = 0; i < links.length; i++) {
    const driveNumber = i + 1;
    await db.update(productsTable)
      .set({ driveUrl: links[i] })
      .where(eq(productsTable.driveNumber, driveNumber));
  }

  console.log("✅ Carga final completada.");
  process.exit(0);
}

run();
