import dayjs from 'dayjs';

function displayUnixDate(epoch) {
    return epoch == null ? '' : dayjs.unix(epoch).format('YYYY-MM-DD H:mm');
}

function nowTime() {
    return dayjs().format('H:mm')
}

export { displayUnixDate, nowTime };