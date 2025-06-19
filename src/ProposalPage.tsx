import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Container, Box, Button, FormControl, InputLabel,
  Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';

// Define file type
interface ProposalFile {
  id: number;
  name: string;
  type: string;
  date: string;
}

const ProposalPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>('');
  const [files, setFiles] = useState<ProposalFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    if (!localStorage.getItem('isAuthenticated')) {
      navigate('/');
    }
    // Load files from localStorage
    const storedFiles: ProposalFile[] = JSON.parse(localStorage.getItem('proposalFiles') || '[]');
    setFiles(storedFiles);
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file || !docType) {
      alert('Please select a file and document type');
      return;
    }

    const newFile: ProposalFile = {
      id: Date.now(),
      name: file.name,
      type: docType,
      date: new Date().toLocaleDateString()
      content: file.
    };

    const updatedFiles = [...files, newFile];
    setFiles(updatedFiles);
    localStorage.setItem('proposalFiles', JSON.stringify(updatedFiles));
    setFile(null);
    setDocType('');
  };

  const handleSelect = (id: number) => {
    setSelectedFiles(prev =>
      prev.includes(id)
        ? prev.filter(fileId => fileId !== id)
        : [...prev, id]
    );
  };

  const handleGenerateProposal = () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file');
      return;
    }
    const selectedFileNames = files
      .filter(file => selectedFiles.includes(file.id))
      .map(file => file.name)
      .join(', ');
    alert(`Generating proposal with selected files: ${selectedFileNames}`);
    // Placeholder for proposal generation logic
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/');
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            ZProposal by Zactonics
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Upload Document
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              component="label"
            >
              Choose File
              <input
                type="file"
                hidden
                onChange={handleFileChange}
              />
            </Button>
            <Typography sx={{ alignSelf: 'center' }}>
              {file ? file.name : 'No file selected'}
            </Typography>
          </Box>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Document Type</InputLabel>
            <Select
              value={docType}
              onChange={(e: React.ChangeEvent<{ value: unknown }>) => setDocType(e.target.value as string)}
              label="Document Type"
            >
              <MenuItem value="Business Capability">Business Capability</MenuItem>
              <MenuItem value="Proposal Template">Proposal Template</MenuItem>
              <MenuItem value="RFI/RFP">RFI/RFP</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            sx={{ ml: 2 }}
            onClick={handleUpload}
          >
            Upload
          </Button>
        </Box>

        <Typography variant="h5" gutterBottom>
          Uploaded Files
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Select</TableCell>
                <TableCell>File Name</TableCell>
                <TableCell>Document Type</TableCell>
                <TableCell>Upload Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map(file => (
                <TableRow key={file.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file.id)}
                      onChange={() => handleSelect(file.id)}
                    />
                  </TableCell>
                  <TableCell>{file.name}</TableCell>
                  <TableCell>{file.type}</TableCell>
                  <TableCell>{file.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 3 }}
          onClick={handleGenerateProposal}
        >
          Generate Proposal
        </Button>
      </Container>
    </Box>
  );
};

export default ProposalPage;