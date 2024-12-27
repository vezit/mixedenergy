# Use the official Node.js 22 image as a parent image
FROM node:22-bookworm

# Install locales, basic utilities, and set up the 'node' user for passwordless sudo if required
RUN apt-get update && apt-get install -y locales sudo tree \
    && echo "node ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node \
    && sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen \
    && dpkg-reconfigure --frontend=noninteractive locales \
    && update-locale LC_ALL=en_US.UTF-8 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for locale
ENV LC_ALL=en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US.UTF-8

# Create the application directory and give ownership to the 'node' user
RUN mkdir -p /usr/src/project/app-main \
    && chown -R node:node /usr/src/project

# Switch to the default non-root user provided by the Node.js image
USER node

# Set the working directory to the app-main directory
WORKDIR /usr/src/project/app-main

# First copy only package.json/package-lock.json, then install dependencies
COPY --chown=node:node package*.json ./
# RUN npm install

# Now copy the rest of your project files
COPY --chown=node:node . .

# Expose the port Next.js (or your Node.js app) runs on
EXPOSE 3000

# Command to start the Next.js application
CMD ["npm", "run", "dev"]
