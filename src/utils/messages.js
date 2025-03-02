export const generateMessage = (username, text) => {
  return {
    username: username?.trim() || "Anonymous",
    text: text?.trim() || "",
    createdAt: Date.now(),
  };
};

export const generateLocationMessage = (username, url) => {
  return {
    username: username?.trim() || "Anonymous",
    url: url?.trim() || "",
    createdAt: Date.now(),
  };
};
