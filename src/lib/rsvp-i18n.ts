/**
 * Guest-facing text for the RSVP page and WhatsApp messages, in English,
 * Sinhala and Tamil. `{name}`-style placeholders are filled by `fill`.
 */

export type Lang = "en" | "si" | "ta";

export const LANGS: { value: Lang; label: string }[] = [
    { value: "en", label: "English" },
    { value: "si", label: "සිංහල" },
    { value: "ta", label: "தமிழ்" },
];

export const isLang = (v: unknown): v is Lang => v === "en" || v === "si" || v === "ta";

export const fill = (text: string, values: Record<string, string | number>) =>
    text.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ""));

const en = {
    invitation: "Wedding invitation",
    dear: "Dear",
    when: "When",
    where: "Where",
    question: "Who will be joining us?",
    tapToChange: "Tap a name to change",
    attending: "Coming",
    notAttending: "Can't come",
    guestN: "Guest {n}",
    meal: "Meal preference",
    meals: { "Non-veg": "Non-veg", Veg: "Vegetarian", Vegan: "Vegan", Halal: "Halal", Kids: "Kids' meal" } as Record<string, string>,
    noMeal: "No preference",
    phone: "WhatsApp number, for updates",
    message: "A message for the couple (optional)",
    send: "Send reply",
    sending: "Sending…",
    noneComing: "Sorry, none of us can come",
    thanksYes: "Thank you! We can't wait to celebrate with you.",
    thanksNo: "Thank you for letting us know. You'll be missed.",
    countComing: "{n} of {total} coming",
    change: "Change my reply",
    error: "Couldn't save your reply. Please try again.",
    // WhatsApp messages
    waInvite: "Dear {name},\n\nWith joy, {couple} invite you to their wedding{date}{place}.\n\nPlease let us know who can come:\n{link}",
    waReminder: "Dear {name},\n\nA gentle reminder from {couple}: we'd love to know if you can join us{date}.\n\nPlease reply here:\n{link}",
    waOn: " on {date}",
    waAt: " at {place}",
};

type Strings = typeof en;

const si: Strings = {
    invitation: "විවාහ මංගල ආරාධනය",
    dear: "ආදරණීය",
    when: "දිනය",
    where: "ස්ථානය",
    question: "සහභාගී වන්නේ කවුද?",
    tapToChange: "වෙනස් කිරීමට නමක් ඔබන්න",
    attending: "පැමිණේ",
    notAttending: "පැමිණිය නොහැක",
    guestN: "අමුත්තා {n}",
    meal: "ආහාර කැමැත්ත",
    meals: { "Non-veg": "මාංශ", Veg: "නිර්මාංශ", Vegan: "වීගන්", Halal: "හලාල්", Kids: "ළමා ආහාර" },
    noMeal: "විශේෂ කැමැත්තක් නැත",
    phone: "WhatsApp අංකය (යාවත්කාලීන තොරතුරු සඳහා)",
    message: "යුවළට පණිවිඩයක් (අවශ්‍ය නම්)",
    send: "පිළිතුර යවන්න",
    sending: "යවමින්…",
    noneComing: "කණගාටුයි, අපට පැමිණිය නොහැක",
    thanksYes: "ස්තූතියි! ඔබ සමඟ සැමරීමට අපි මහත් ආශාවෙන් සිටිමු.",
    thanksNo: "දැනුම් දුන්නාට ස්තූතියි. ඔබ නොමැතිකම අපට දැනෙනු ඇත.",
    countComing: "{total} දෙනාගෙන් {n} දෙනෙක් පැමිණේ",
    change: "පිළිතුර වෙනස් කරන්න",
    error: "ඔබේ පිළිතුර සුරැකීමට නොහැකි විය. නැවත උත්සාහ කරන්න.",
    waInvite: "ආදරණීය {name},\n\n{couple}ගේ විවාහ මංගල්‍යයට{date}{place} ඔබට සාදරයෙන් ආරාධනා කරමු.\n\nපැමිණෙන්නේ කවුදැයි කරුණාකර මෙතැනින් දන්වන්න:\n{link}",
    waReminder: "ආදරණීය {name},\n\n{couple}ගේ විවාහ මංගල්‍යයට{date} ඔබට පැමිණිය හැකිදැයි දැනගැනීමට අපි කැමැත්තෙමු.\n\nකරුණාකර මෙතැනින් පිළිතුරු දෙන්න:\n{link}",
    waOn: " ({date})",
    waAt: " {place} හිදී",
};

const ta: Strings = {
    invitation: "திருமண அழைப்பிதழ்",
    dear: "அன்புள்ள",
    when: "தேதி",
    where: "இடம்",
    question: "யார் யார் கலந்து கொள்வீர்கள்?",
    tapToChange: "மாற்ற பெயரைத் தொடவும்",
    attending: "வருகிறார்",
    notAttending: "வர இயலாது",
    guestN: "விருந்தினர் {n}",
    meal: "உணவு விருப்பம்",
    meals: { "Non-veg": "அசைவம்", Veg: "சைவம்", Vegan: "வீகன்", Halal: "ஹலால்", Kids: "குழந்தைகள் உணவு" },
    noMeal: "விருப்பம் இல்லை",
    phone: "WhatsApp எண் (தகவல்களுக்காக)",
    message: "மணமக்களுக்கு ஒரு செய்தி (விரும்பினால்)",
    send: "பதிலை அனுப்பு",
    sending: "அனுப்புகிறது…",
    noneComing: "மன்னிக்கவும், எங்களில் யாராலும் வர இயலாது",
    thanksYes: "நன்றி! உங்களுடன் கொண்டாட ஆவலுடன் காத்திருக்கிறோம்.",
    thanksNo: "தெரிவித்ததற்கு நன்றி. நீங்கள் இல்லாதது எங்களுக்குக் குறையாக இருக்கும்.",
    countComing: "{total} பேரில் {n} பேர் வருகிறார்கள்",
    change: "பதிலை மாற்று",
    error: "உங்கள் பதிலைச் சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    waInvite: "அன்புள்ள {name},\n\n{couple} அவர்களின் திருமணத்திற்கு{date}{place} உங்களை அன்புடன் அழைக்கிறோம்.\n\nயார் யார் வருவீர்கள் என்று இங்கே தெரிவிக்கவும்:\n{link}",
    waReminder: "அன்புள்ள {name},\n\n{couple} அவர்களின் திருமணத்திற்கு{date} நீங்கள் வர முடியுமா என்று அறிய விரும்புகிறோம்.\n\nதயவுசெய்து இங்கே பதிலளிக்கவும்:\n{link}",
    waOn: " ({date})",
    waAt: " {place}",
};

export const STRINGS: Record<Lang, Strings> = { en, si, ta };

const MONTHS: Record<Lang, string[]> = {
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    si: ["ජනවාරි", "පෙබරවාරි", "මාර්තු", "අප්‍රේල්", "මැයි", "ජූනි", "ජූලි", "අගෝස්තු", "සැප්තැම්බර්", "ඔක්තෝබර්", "නොවැම්බර්", "දෙසැම්බර්"],
    ta: ["ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"],
};
const WEEKDAYS: Record<Lang, string[]> = {
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    si: ["ඉරිදා", "සඳුදා", "අඟහරුවාදා", "බදාදා", "බ්‍රහස්පතින්දා", "සිකුරාදා", "සෙනසුරාදා"],
    ta: ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"],
};

/**
 * Formats a YYYY-MM-DD date by hand: browsers and Node don't all ship Sinhala
 * and Tamil locale data, and the RSVP page must render the same on both.
 */
export function formatDate(iso: string, lang: Lang) {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return iso.slice(0, 10);
    const weekday = WEEKDAYS[lang][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    const month = MONTHS[lang][m - 1];
    if (lang === "si") return `${y} ${month} ${d}, ${weekday}`;
    if (lang === "ta") return `${d} ${month} ${y}, ${weekday}`;
    return `${weekday}, ${d} ${month} ${y}`;
}

/** The pre-filled WhatsApp text for an invite or a reminder. */
export function whatsappMessage(
    kind: "invite" | "reminder",
    lang: Lang,
    v: { name: string; couple: string; date?: string | null; place?: string | null; link: string }
) {
    const t = STRINGS[lang];
    return fill(kind === "invite" ? t.waInvite : t.waReminder, {
        name: v.name,
        couple: v.couple,
        link: v.link,
        date: v.date ? fill(t.waOn, { date: formatDate(v.date, lang) }) : "",
        place: v.place ? fill(t.waAt, { place: v.place }) : "",
    });
}
