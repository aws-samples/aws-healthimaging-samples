// user is authenticated if the object has the email_verified: true attribute
export default function isUserAuth(user) {
    return user?.attributes?.email_verified ? true : false;
}
