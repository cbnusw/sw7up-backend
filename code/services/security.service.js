exports.unidentify = user => {
  if (user.role === 'staff') {
    user.no = `${user.no.substr(0, 3)}**${user.no.substr(5)}`;
  } else if (user.role === 'student') {
    user.no = `${user.no.substr(0, 4)}*****${user.no.substr(9)}`;
  } else {
    user.no = user.no.substr(0, Math.floor(user.no.length / 2)).padEnd(user.no.length, '*');
  }
  return user;
};
