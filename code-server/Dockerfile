FROM codercom/code-server:latest

# Copy and install extensions as root
COPY extensions.txt /extensions.txt
RUN while read -r extension || [ -n "$extension" ]; do \
    code-server --install-extension "$extension"; \
    done < /extensions.txt

# Switch to coder BEFORE copying settings
USER coder

# Now copy settings directly as the coder user
COPY --chown=coder:coder config/settings.json /home/coder/.local/share/code-server/User/settings.json

ENV PASSWORD=dev123
