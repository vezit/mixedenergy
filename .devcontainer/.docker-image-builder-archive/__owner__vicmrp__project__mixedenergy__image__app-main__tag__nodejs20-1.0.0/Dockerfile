# Use an official Node.js runtime as a parent image
FROM node:20-bookworm

# Install locales and basic utilities
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

# Set the working directory to the app-main directory
WORKDIR /usr/src/project/app-main

# Install necessary packages
RUN npm install next firebase firebase-admin

# Copy the project files into the container
COPY --chown=node:node . .

# Switch to the default non-root user provided by the Node.js image
USER node

# Expose the port Next.js runs on
EXPOSE 3000

# Command to start the Next.js application
CMD ["npm", "run", "dev"]
