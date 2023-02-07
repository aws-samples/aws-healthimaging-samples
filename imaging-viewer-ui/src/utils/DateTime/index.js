import dayjs from 'dayjs';

function displayUnixDate(epoch) {
    return epoch == null ? '' : dayjs.unix(epoch).format('YYYY-MM-DD hh:mm A');
}

function nowTime() {
    return dayjs().format('h:mm A')
}

export { displayUnixDate, nowTime };