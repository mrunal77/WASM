const formatters = new Map();

function getFormatter(timeZone) {
    let formatter = formatters.get(timeZone);

    if (!formatter) {
        formatter = new Intl.DateTimeFormat("en-US", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
            timeZoneName: "short"
        });
        formatters.set(timeZone, formatter);
    }

    return formatter;
}

function getOffsetMinutes(date, timeZone) {
    const values = getParts(date, timeZone);
    const zonedTime = Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        values.hour === "24" ? 0 : Number(values.hour),
        Number(values.minute),
        Number(values.second)
    );
    const utcTime = Math.floor(date.getTime() / 1000) * 1000;
    return Math.round((zonedTime - utcTime) / 60000);
}

function getParts(date, timeZone) {
    return getFormatter(timeZone).formatToParts(date).reduce((values, part) => {
        if (part.type !== "literal") {
            values[part.type] = part.value;
        }
        return values;
    }, {});
}

function formatOffset(offsetMinutes) {
    const sign = offsetMinutes < 0 ? "−" : "+";
    const absoluteMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absoluteMinutes / 60).toString().padStart(2, "0");
    const minutes = (absoluteMinutes % 60).toString().padStart(2, "0");
    return `UTC${sign}${hours}:${minutes}`;
}

export function getLocalTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function getWorldTimes(timeZones) {
    const now = new Date();
    return timeZones.map(timeZone => {
        const values = getParts(now, timeZone);
        const hour = values.hour === "24" ? "00" : values.hour;
        const offsetMinutes = getOffsetMinutes(now, timeZone);

        return {
            timeZone,
            year: Number(values.year),
            month: Number(values.month),
            day: Number(values.day),
            weekday: values.weekday,
            hour,
            minute: values.minute,
            second: values.second,
            offsetMinutes,
            offsetLabel: formatOffset(offsetMinutes),
            abbreviation: values.timeZoneName
        };
    });
}
